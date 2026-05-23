const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const store = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// ------- 中间件 -------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, 'public'), { maxAge: '7d' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '7d' }));

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
app.post('/api/submit', upload.array('photos', 5), async (req, res) => {
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

    await store.addSubmission(submission);

    res.json({ success: true, message: '提交成功！我们会尽快与您联系。', id: submission.id });
  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ success: false, message: '服务器错误，请稍后再试' });
  }
});

// 获取统计数据（公开）
app.get('/api/stats', async (req, res) => {
  try {
    const submissions = await store.getAll();
    const total = submissions.length;
    const totalArea = submissions.reduce((a, s) => a + s.area, 0);
    const provinces = [...new Set(submissions.map(s => s.province))].length;
    res.json({ success: true, total, totalArea: Math.round(totalArea), provinces });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取收录列表（脱敏，公开）
app.get('/api/list', async (req, res) => {
  try {
    const list = await store.getList(100);
    const total = await store.getTotal();
    const items = list.map(s => ({
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
    res.json({ success: true, list: items, total });
  } catch (err) {
    console.error('List error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 管理员：获取全部详情（含联系方式）
app.get('/api/admin/all', async (req, res) => {
  const token = req.query.token;
  if (token !== 'zhizhuxiang2026') {
    return res.status(401).json({ success: false, message: 'unauthorized' });
  }
  try {
    const submissions = await store.getAll();
    res.json({ success: true, submissions });
  } catch (err) {
    console.error('Admin all error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 管理员：标记已联系
app.post('/api/admin/contacted', async (req, res) => {
  const token = req.query.token;
  if (token !== 'zhizhuxiang2026') {
    return res.status(401).json({ success: false, message: 'unauthorized' });
  }
  try {
    const { id } = req.body;
    const ok = await store.markContacted(id);
    if (ok) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: 'not found' });
    }
  } catch (err) {
    console.error('Contacted error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 管理员：删除提交
app.post('/api/admin/delete', async (req, res) => {
  const token = req.query.token;
  if (token !== 'zhizhuxiang2026') {
    return res.status(401).json({ success: false, message: 'unauthorized' });
  }
  try {
    const { id } = req.body;
    const ok = await store.deleteSubmission(id);
    if (ok) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: 'not found' });
    }
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
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
async function start() {
  await store.init();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  🐷 智猪侠 · 托猪所联盟`);
    console.log(`  ─────────────────────────`);
    console.log(`  收录页:  http://localhost:${PORT}`);
    console.log(`  管理后台: http://localhost:${PORT}/admin?token=zhizhuxiang2026`);
    console.log(`  ─────────────────────────\n`);
  });
}

start().catch(err => {
  console.error('启动失败:', err);
  process.exit(1);
});
