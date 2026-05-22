const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3001;

// ------- 数据存储 -------
const DATA_FILE = path.join(__dirname, 'data', 'submissions.json');
const ensureDataFile = () => {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ submissions: [] }, null, 2));
  }
};
ensureDataFile();

const readData = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const writeData = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

// ------- 中间件 -------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2) + ext);
  }
});
const upload = multer({ storage });

// ------- API 路由 -------

// 提交养殖场信息
app.post('/api/submit', upload.array('photos', 5), (req, res) => {
  try {
    const { name, phone, province, city, county, town, village, area, status, landType, landShape, landHolder, landNature, surveyed, hasOtherFarm, priceExpectation, water, electricity, road, description, note } = req.body;

    // 验证必填字段
    if (!name || !phone || !province || !county) {
      return res.json({ success: false, message: '请填写完整的联系信息和地区信息' });
    }
    if (!landHolder) {
      return res.json({ success: false, message: '请选择土地持有人' });
    }
    if (!landNature) {
      return res.json({ success: false, message: '请选择土地性质' });
    }
    if (!status) {
      return res.json({ success: false, message: '请选择目前状态' });
    }
    if (!area || parseFloat(area) < 3 || parseFloat(area) > 200) {
      return res.json({ success: false, message: '面积数据异常，请检查' });
    }

    const photos = req.files ? req.files.map(f => '/uploads/' + f.filename) : [];

    const submission = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name,
      phone,
      province,
      city: city || '',
      county,
      town: town || '',
      village: village || '',
      area: parseFloat(area),
      landType: landType || '',
      landShape: landShape || '',
      landHolder: landHolder || '',
      landNature: landNature || '',
      status: status || '闲置',
      surveyed: surveyed || '',
      hasOtherFarm: hasOtherFarm || '',
      priceExpectation: priceExpectation || '',
      water: water === '是',
      electricity: electricity === '是',
      road: road === '是',
      description: description || '',
      note: note || '',
      photos,
      createdAt: new Date().toISOString(),
      contacted: false
    };

    const data = readData();
    data.submissions.unshift(submission);
    writeData(data);

    res.json({ success: true, message: '提交成功！我们会尽快与您联系。', id: submission.id });
  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ success: false, message: '服务器错误，请稍后再试' });
  }
});

// 获取统计数据（公开）
app.get('/api/stats', (req, res) => {
  const data = readData();
  const total = data.submissions.length;
  const areas = data.submissions.map(s => s.area);
  const totalArea = areas.reduce((a, b) => a + b, 0);
  const provinces = [...new Set(data.submissions.map(s => s.province))].length;
  res.json({ success: true, total, totalArea: Math.round(totalArea), provinces });
});

// 获取收录列表（脱敏，公开）
app.get('/api/list', (req, res) => {
  const data = readData();
  const list = data.submissions.slice(0, 100).map(s => ({
    id: s.id,
    landType: s.landType || '',
    province: s.province,
    city: s.city,
    county: s.county,
    town: s.town,
    village: s.village,
    area: s.area,
    landNature: s.landNature || '',
    status: s.status,
    createdAt: s.createdAt.slice(0, 10)
  }));
  res.json({ success: true, list, total: data.submissions.length });
});

// 管理员：获取全部详情（含联系方式）
app.get('/api/admin/all', (req, res) => {
  const token = req.query.token;
  if (token !== 'zhizhuxiang2026') {
    return res.status(401).json({ success: false, message: 'unauthorized' });
  }
  const data = readData();
  res.json({ success: true, submissions: data.submissions });
});

// 管理员：标记已联系
app.post('/api/admin/contacted', (req, res) => {
  const token = req.query.token;
  if (token !== 'zhizhuxiang2026') {
    return res.status(401).json({ success: false, message: 'unauthorized' });
  }
  const { id } = req.body;
  const data = readData();
  const sub = data.submissions.find(s => s.id === id);
  if (sub) {
    sub.contacted = true;
    writeData(data);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: 'not found' });
  }
});

// ------- 前端页面 -------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// ------- 启动 -------
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🐷 智猪乡盟 · 托猪所联盟`);
  console.log(`  ─────────────────────────`);
  console.log(`  收录页:  http://localhost:${PORT}`);
  console.log(`  管理后台: http://localhost:${PORT}/admin?token=zhizhuxiang2026`);
  console.log(`  ─────────────────────────\n`);
});
