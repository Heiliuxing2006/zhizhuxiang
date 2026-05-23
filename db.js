/**
 * 智猪侠 · 数据存储模块
 * 支持 PostgreSQL（当 DATABASE_URL 环境变量存在时）
 * 回退到 JSON 文件存储（无 DATABASE_URL 时）
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DATA_FILE = path.join(__dirname, 'data', 'submissions.json');

// ── 判断使用哪种存储 ──
const useDb = !!process.env.DATABASE_URL;
let pool;

if (useDb) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
}

// ── 初始化 ──
async function init() {
  if (useDb) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        province TEXT NOT NULL,
        city TEXT DEFAULT '',
        county TEXT NOT NULL,
        town TEXT DEFAULT '',
        village TEXT DEFAULT '',
        area DOUBLE PRECISION NOT NULL,
        land_type TEXT DEFAULT '',
        land_shape TEXT DEFAULT '',
        land_holder TEXT DEFAULT '',
        land_nature TEXT DEFAULT '',
        status TEXT DEFAULT '闲置',
        surveyed TEXT DEFAULT '',
        has_other_farm TEXT DEFAULT '',
        price_expectation TEXT DEFAULT '',
        water BOOLEAN DEFAULT false,
        electricity BOOLEAN DEFAULT false,
        road BOOLEAN DEFAULT false,
        description TEXT DEFAULT '',
        note TEXT DEFAULT '',
        photos TEXT DEFAULT '[]',
        created_at TEXT NOT NULL,
        contacted BOOLEAN DEFAULT false
      )
    `);
    console.log('  📦 PostgreSQL 存储已就绪');
  } else {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify({ submissions: [] }, null, 2));
    }
    console.log('  📄 JSON 文件存储已就绪');
  }
}

// ── 转换行记录 → 前端对象格式 ──
function rowToSubmission(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    province: row.province,
    city: row.city || '',
    county: row.county,
    town: row.town || '',
    village: row.village || '',
    area: row.area,
    landType: row.land_type || '',
    landShape: row.land_shape || '',
    landHolder: row.land_holder || '',
    landNature: row.land_nature || '',
    status: row.status || '闲置',
    surveyed: row.surveyed || '',
    hasOtherFarm: row.has_other_farm || '',
    priceExpectation: row.price_expectation || '',
    water: row.water,
    electricity: row.electricity,
    road: row.road,
    description: row.description || '',
    note: row.note || '',
    photos: typeof row.photos === 'string' ? JSON.parse(row.photos) : (row.photos || []),
    createdAt: row.created_at,
    contacted: row.contacted
  };
}

// ── 获取全部 ──
async function getAll() {
  if (useDb) {
    const result = await pool.query('SELECT * FROM submissions ORDER BY created_at DESC');
    return result.rows.map(rowToSubmission);
  }
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  return data.submissions;
}

// ── 获取列表（脱敏，limit 条） ──
async function getList(limit = 100) {
  if (useDb) {
    const result = await pool.query(
      'SELECT * FROM submissions ORDER BY created_at DESC LIMIT $1', [limit]
    );
    return result.rows.map(rowToSubmission);
  }
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  return data.submissions.slice(0, limit);
}

// ── 获取总数（用于 list 接口的总数） ──
async function getTotal() {
  if (useDb) {
    const result = await pool.query('SELECT COUNT(*) FROM submissions');
    return parseInt(result.rows[0].count, 10);
  }
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  return data.submissions.length;
}

// ── 添加提交 ──
async function addSubmission(sub) {
  if (useDb) {
    await pool.query(`
      INSERT INTO submissions (
        id, name, phone, province, city, county, town, village,
        area, land_type, land_shape, land_holder, land_nature, status,
        surveyed, has_other_farm, price_expectation,
        water, electricity, road, description, note,
        photos, created_at, contacted
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
    `, [
      sub.id, sub.name, sub.phone, sub.province, sub.city, sub.county, sub.town, sub.village,
      sub.area, sub.landType, sub.landShape, sub.landHolder, sub.landNature, sub.status,
      sub.surveyed, sub.hasOtherFarm, sub.priceExpectation,
      sub.water, sub.electricity, sub.road, sub.description, sub.note,
      JSON.stringify(sub.photos), sub.createdAt, sub.contacted
    ]);
  } else {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    data.submissions.unshift(sub);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  }
}

// ── 标记已联系 ──
async function markContacted(id) {
  if (useDb) {
    const result = await pool.query(
      'UPDATE submissions SET contacted = true WHERE id = $1 RETURNING *', [id]
    );
    return result.rowCount > 0;
  }
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const sub = data.submissions.find(s => s.id === id);
  if (sub) {
    sub.contacted = true;
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  }
  return false;
}

module.exports = { init, getAll, getList, getTotal, addSubmission, markContacted, useDb };
