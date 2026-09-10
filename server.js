const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const PDFDocument = require("pdfkit");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = process.env.DB_FILE || path.join(__dirname, "arquitetura.db");

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const db = new sqlite3.Database(DB_FILE);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
  });
}
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
  });
}
async function initDb() {
  await run(`PRAGMA foreign_keys = ON`);
  await run(`CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('domain','business_service','application_service','technology')),
    description TEXT DEFAULT '',
    owner TEXT DEFAULT '',
    critical INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Ativo',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await run(`CREATE TABLE IF NOT EXISTS relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL,
    target_id INTEGER NOT NULL,
    relation_type TEXT NOT NULL DEFAULT 'Depende de',
    impact_level TEXT NOT NULL DEFAULT 'Médio',
    description TEXT DEFAULT '',
    FOREIGN KEY(source_id) REFERENCES assets(id) ON DELETE CASCADE,
    FOREIGN KEY(target_id) REFERENCES assets(id) ON DELETE CASCADE,
    CHECK(source_id <> target_id),
    UNIQUE(source_id, target_id, relation_type)
  )`);

  const count = await get(`SELECT COUNT(*) AS total FROM assets`);
  if (count.total === 0) {
    const seeds = [
      ["Gestão Comercial", "domain", "Domínio responsável por vendas, clientes e faturamento.", "Negócios", 1],
      ["Operações", "domain", "Domínio responsável pela execução dos serviços e processos operacionais.", "Operações", 1],
      ["Financeiro", "domain", "Domínio de contas, cobrança, pagamentos e indicadores financeiros.", "Finanças", 1],
      ["Atendimento ao Cliente", "business_service", "Serviço de negócio para registro e acompanhamento de solicitações.", "CX", 0],
      ["Faturamento", "business_service", "Serviço de negócio para emissão e gestão de cobranças.", "Finanças", 1],
      ["Portal do Cliente", "application_service", "Aplicação que disponibiliza autosserviço e consulta de dados.", "TI", 1],
      ["ERP Corporativo", "application_service", "Sistema corporativo integrado aos processos financeiros e operacionais.", "TI", 1],
      ["CRM", "application_service", "Aplicação para gestão do relacionamento com clientes.", "TI", 0],
      ["Banco de Dados", "technology", "Camada tecnológica de persistência dos dados corporativos.", "Infraestrutura", 1],
      ["API Gateway", "technology", "Componente de integração e controle de APIs.", "Arquitetura", 0],
      ["Serviço de Identidade", "technology", "Autenticação e autorização para os sistemas.", "Segurança", 1],
      ["Servidor de Aplicação", "technology", "Runtime dos serviços corporativos.", "Infraestrutura", 1]
    ];
    for (const a of seeds) {
      await run(`INSERT INTO assets(name,type,description,owner,critical) VALUES(?,?,?,?,?)`, a);
    }
    const ids = {};
    for (const r of await all(`SELECT id,name FROM assets`)) ids[r.name] = r.id;
    const rels = [
      ["Atendimento ao Cliente","CRM","Utiliza", "Alto"],
      ["Faturamento","ERP Corporativo","Utiliza", "Alto"],
      ["Portal do Cliente","CRM","Depende de", "Médio"],
      ["Portal do Cliente","Serviço de Identidade","Depende de", "Alto"],
      ["CRM","Banco de Dados","Persiste em", "Alto"],
      ["ERP Corporativo","Banco de Dados","Persiste em", "Crítico"],
      ["ERP Corporativo","API Gateway","Integra com", "Alto"],
      ["API Gateway","Serviço de Identidade","Valida em", "Alto"],
      ["API Gateway","Servidor de Aplicação","Executa em", "Médio"],
      ["CRM","Servidor de Aplicação","Executa em", "Médio"],
      ["ERP Corporativo","Servidor de Aplicação","Executa em", "Alto"],
      ["Gestão Comercial","Atendimento ao Cliente","Disponibiliza", "Médio"],
      ["Gestão Comercial","CRM","Suporta", "Alto"],
      ["Operações","ERP Corporativo","Suporta", "Alto"],
      ["Financeiro","Faturamento","Disponibiliza", "Crítico"]
    ];
    for (const [s,t,rt,impact] of rels) {
      await run(`INSERT OR IGNORE INTO relationships(source_id,target_id,relation_type,impact_level) VALUES(?,?,?,?)`,
        [ids[s], ids[t], rt, impact]);
    }
  }
}

app.get("/api/report.pdf", async (req,res) => {
  try {
    const assets = await all(`SELECT * FROM assets ORDER BY type, name`);
    const relationships = await all(`SELECT r.*, s.name AS source_name, s.type AS source_type, t.name AS target_name, t.type AS target_type FROM relationships r JOIN assets s ON s.id=r.source_id JOIN assets t ON t.id=r.target_id ORDER BY r.id`);
    const redundancy = await all(`SELECT LOWER(TRIM(name)) AS key, type, COUNT(*) AS total, GROUP_CONCAT(name, ' | ') AS names FROM assets GROUP BY LOWER(TRIM(name)), type HAVING COUNT(*) > 1 ORDER BY total DESC`);
    const critical = await all(`SELECT a.*, (SELECT COUNT(*) FROM relationships r WHERE r.target_id=a.id) AS dependents, (SELECT COUNT(*) FROM relationships r WHERE r.source_id=a.id) AS dependencies FROM assets a WHERE a.critical=1 ORDER BY dependents DESC, dependencies DESC`);
    const hotspots = await all(`SELECT a.id,a.name,a.type,a.critical, (SELECT COUNT(*) FROM relationships r WHERE r.source_id=a.id) + (SELECT COUNT(*) FROM relationships r WHERE r.target_id=a.id) AS degree FROM assets a ORDER BY degree DESC LIMIT 10`);
    const labels = {domain:"Domínio arquitetural", business_service:"Serviço de negócio", application_service:"Serviço de aplicação", technology:"Componente tecnológico"};
    const doc = new PDFDocument({size:"A4", margin:45, bufferPages:true, info:{Title:"Relatório de Arquitetura Empresarial", Author:"Sistema de Arquitetura Empresarial"}});
    res.setHeader("Content-Type","application/pdf"); res.setHeader("Content-Disposition","attachment; filename=relatorio-arquitetura-empresarial.pdf"); doc.pipe(res);
    const ensure=()=>{if(doc.y>755)doc.addPage()};
    const title=t=>{ensure();doc.font("Helvetica-Bold").fontSize(17).fillColor("#63368a").text(t);doc.moveDown(.35);doc.font("Helvetica").fillColor("#273043")};
    const line=(t,size=9.5)=>{ensure();doc.font("Helvetica").fontSize(size).fillColor("#273043").text(t,{lineGap:2});};
    doc.font("Helvetica-Bold").fontSize(24).fillColor("#63368a").text("Relatório de Arquitetura Empresarial"); doc.font("Helvetica").fontSize(10).fillColor("#667085").text(`Gerado em ${new Date().toLocaleString("pt-BR")}`); doc.moveDown(.7);
    line("Objetivo: organizar uma visão empresarial em camadas, identificando dependências, redundâncias e impactos de mudança.",10); doc.moveDown(.4); line(`Resumo: ${assets.length} ativos | ${relationships.length} relacionamentos | ${critical.length} ativos críticos | ${redundancy.length} grupos de possíveis redundâncias`,10);
    title("1. Visão da arquitetura em camadas");
    for(const type of ["domain","business_service","application_service","technology"]){doc.font("Helvetica-Bold").fontSize(12).fillColor("#63368a").text(labels[type]);assets.filter(a=>a.type===type).forEach(a=>line(`• ${a.name}${a.critical?" [CRÍTICO]":""} — Responsável: ${a.owner||"Não informado"}. ${a.description||""}`));doc.moveDown(.25)}
    title("2. Ativos cadastrados"); assets.forEach((a,i)=>line(`${i+1}. ${a.name} | ${labels[a.type]} | Status: ${a.status} | Responsável: ${a.owner||"-"}${a.critical?" | CRÍTICO":""}\n   ${a.description||"Sem descrição."}`));
    title("3. Relacionamentos e dependências"); if(!relationships.length)line("Nenhum relacionamento cadastrado."); relationships.forEach((r,i)=>line(`${i+1}. ${r.source_name} → ${r.target_name} | ${r.relation_type} | Impacto: ${r.impact_level}${r.description?` | ${r.description}`:""}`));
    title("4. Redundâncias identificadas"); if(!redundancy.length)line("Nenhuma possível redundância encontrada."); redundancy.forEach((r,i)=>line(`${i+1}. ${r.names} | ${labels[r.type]} | ${r.total} ocorrências`));
    title("5. Pontos críticos"); if(!critical.length)line("Nenhum ativo marcado como crítico."); critical.forEach((a,i)=>line(`${i+1}. ${a.name} | Dependentes: ${a.dependents} | Dependências: ${a.dependencies}`));
    title("6. Concentradores de dependência"); hotspots.forEach((a,i)=>line(`${i+1}. ${a.name} | ${labels[a.type]} | Grau de conexão: ${a.degree}${a.critical?" | CRÍTICO":""}`));
    title("7. Análise de impacto cruzado");
    for(const root of assets){const downstream=await all(`WITH RECURSIVE deps(id, depth, path) AS (SELECT target_id,1,printf('%d',target_id) FROM relationships WHERE source_id=? UNION ALL SELECT r.target_id,d.depth+1,d.path||','||r.target_id FROM relationships r JOIN deps d ON r.source_id=d.id WHERE d.depth<20 AND instr(','||d.path||',',','||r.target_id||',')=0) SELECT DISTINCT a.name,a.type,a.critical,MIN(d.depth) AS depth FROM deps d JOIN assets a ON a.id=d.id GROUP BY a.id ORDER BY depth,a.name`,[root.id]); if(downstream.length)line(`• ${root.name}: ${downstream.map(x=>`${x.name} (nível ${x.depth}${x.critical?", crítico":""})`).join(", ")}`)}
    if(!relationships.length)line("Cadastre relacionamentos para gerar a análise de impacto.");
    title("8. Conclusão"); line("O sistema permite caracterizar os domínios arquiteturais, mapear relações, distinguir as camadas de negócio/aplicação/tecnologia, identificar possíveis redundâncias e pontos críticos e avaliar impactos decorrentes de mudanças na arquitetura.",10);
    const range=doc.bufferedPageRange(); for(let i=range.start;i<range.start+range.count;i++){doc.switchToPage(i);doc.font("Helvetica").fontSize(8).fillColor("#667085").text(`Relatório de Arquitetura Empresarial • Página ${i+1} de ${range.count}`,45,805,{align:"center",width:505})} doc.end();
  } catch(e){console.error(e);if(!res.headersSent)res.status(500).json({error:e.message});}
});

app.get("/api/assets", async (req,res) => {
  try { res.json(await all(`SELECT * FROM assets ORDER BY type, name`)); }
  catch(e){ res.status(500).json({error:e.message}); }
});
app.post("/api/assets", async (req,res) => {
  try {
    const {name,type,description="",owner="",critical=0,status="Ativo"} = req.body;
    if (!name || !["domain","business_service","application_service","technology"].includes(type))
      return res.status(400).json({error:"Nome e tipo válido são obrigatórios."});
    const r = await run(`INSERT INTO assets(name,type,description,owner,critical,status) VALUES(?,?,?,?,?,?)`,
      [name.trim(),type,description,owner,critical?1:0,status]);
    res.status(201).json(await get(`SELECT * FROM assets WHERE id=?`,[r.id]));
  } catch(e){ res.status(500).json({error:e.message}); }
});
app.put("/api/assets/:id", async (req,res) => {
  try {
    const {name,type,description="",owner="",critical=0,status="Ativo"} = req.body;
    if (!name || !["domain","business_service","application_service","technology"].includes(type))
      return res.status(400).json({error:"Nome e tipo válido são obrigatórios."});
    await run(`UPDATE assets SET name=?,type=?,description=?,owner=?,critical=?,status=? WHERE id=?`,
      [name.trim(),type,description,owner,critical?1:0,status,req.params.id]);
    const row = await get(`SELECT * FROM assets WHERE id=?`,[req.params.id]);
    if (!row) return res.status(404).json({error:"Registro não encontrado."});
    res.json(row);
  } catch(e){ res.status(500).json({error:e.message}); }
});
app.delete("/api/assets/:id", async (req,res) => {
  try { await run(`DELETE FROM assets WHERE id=?`,[req.params.id]); res.status(204).end(); }
  catch(e){ res.status(500).json({error:e.message}); }
});

app.get("/api/relationships", async (req,res) => {
  try {
    res.json(await all(`SELECT r.*, s.name AS source_name, s.type AS source_type, t.name AS target_name, t.type AS target_type
      FROM relationships r JOIN assets s ON s.id=r.source_id JOIN assets t ON t.id=r.target_id
      ORDER BY r.id DESC`));
  } catch(e){ res.status(500).json({error:e.message}); }
});
app.post("/api/relationships", async (req,res) => {
  try {
    const {source_id,target_id,relation_type="Depende de",impact_level="Médio",description=""} = req.body;
    if (!source_id || !target_id || source_id === target_id)
      return res.status(400).json({error:"Origem e destino devem ser diferentes."});
    const r = await run(`INSERT INTO relationships(source_id,target_id,relation_type,impact_level,description) VALUES(?,?,?,?,?)`,
      [source_id,target_id,relation_type,impact_level,description]);
    res.status(201).json(await get(`SELECT r.*, s.name AS source_name, t.name AS target_name
      FROM relationships r JOIN assets s ON s.id=r.source_id JOIN assets t ON t.id=r.target_id WHERE r.id=?`,[r.id]));
  } catch(e){ res.status(400).json({error:"Essa relação já existe ou contém dados inválidos."}); }
});
app.delete("/api/relationships/:id", async (req,res) => {
  try { await run(`DELETE FROM relationships WHERE id=?`,[req.params.id]); res.status(204).end(); }
  catch(e){ res.status(500).json({error:e.message}); }
});

app.get("/api/impact/:id", async (req,res) => {
  try {
    const id = Number(req.params.id);
    const root = await get(`SELECT * FROM assets WHERE id=?`,[id]);
    if (!root) return res.status(404).json({error:"Ativo não encontrado."});
    const downstream = await all(`
      WITH RECURSIVE deps(id, depth, path) AS (
        SELECT target_id, 1, printf('%d', target_id) FROM relationships WHERE source_id=?
        UNION ALL
        SELECT r.target_id, d.depth+1, d.path || ',' || r.target_id
        FROM relationships r JOIN deps d ON r.source_id=d.id
        WHERE d.depth < 20 AND instr(','||d.path||',', ','||r.target_id||',')=0
      )
      SELECT DISTINCT a.id,a.name,a.type,a.critical,a.status,MIN(d.depth) AS depth
      FROM deps d JOIN assets a ON a.id=d.id GROUP BY a.id ORDER BY depth,a.name`, [id]);
    const upstream = await all(`
      WITH RECURSIVE deps(id, depth, path) AS (
        SELECT source_id, 1, printf('%d', source_id) FROM relationships WHERE target_id=?
        UNION ALL
        SELECT r.source_id, d.depth+1, d.path || ',' || r.source_id
        FROM relationships r JOIN deps d ON r.target_id=d.id
        WHERE d.depth < 20 AND instr(','||d.path||',', ','||r.source_id||',')=0
      )
      SELECT DISTINCT a.id,a.name,a.type,a.critical,a.status,MIN(d.depth) AS depth
      FROM deps d JOIN assets a ON a.id=d.id GROUP BY a.id ORDER BY depth,a.name`, [id]);
    res.json({root,downstream,upstream});
  } catch(e){ res.status(500).json({error:e.message}); }
});

app.get("/api/analysis", async (req,res) => {
  try {
    const redundancy = await all(`
      SELECT LOWER(TRIM(name)) AS key, type, COUNT(*) AS total,
             GROUP_CONCAT(name, ' | ') AS names
      FROM assets GROUP BY LOWER(TRIM(name)), type HAVING COUNT(*) > 1 ORDER BY total DESC`);
    const critical = await all(`
      SELECT a.*, (SELECT COUNT(*) FROM relationships r WHERE r.target_id=a.id) AS dependents,
             (SELECT COUNT(*) FROM relationships r WHERE r.source_id=a.id) AS dependencies
      FROM assets a WHERE a.critical=1
      ORDER BY dependents DESC, dependencies DESC`);
    const hotspots = await all(`
      SELECT a.id,a.name,a.type,a.critical,
        (SELECT COUNT(*) FROM relationships r WHERE r.source_id=a.id) +
        (SELECT COUNT(*) FROM relationships r WHERE r.target_id=a.id) AS degree
      FROM assets a
      ORDER BY degree DESC LIMIT 10`);
    res.json({redundancy,critical,hotspots});
  } catch(e){ res.status(500).json({error:e.message}); }
});

app.use((req,res) => res.sendFile(path.join(__dirname,"public","index.html")));

initDb().then(() => {
  app.listen(PORT, () => console.log(`Arquitetura Empresarial rodando em http://localhost:${PORT}`));
}).catch(err => { console.error(err); process.exit(1); });
