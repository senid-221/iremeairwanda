var express = require('express');
var router = express.Router();
var { PrismaClient } = require('@prisma/client');

var prisma = new PrismaClient();

/* ------------------------------------------------------------------ */
/*  GET /api/locations/provinces                                       */
/* ------------------------------------------------------------------ */
router.get('/provinces', async function (req, res) {
  try {
    var items = await prisma.province.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      select: { id: true, code: true, name: true, nameEn: true, nameRw: true },
    });
    res.json({ items: items });
  } catch (err) {
    console.error('locations/provinces error:', err);
    res.status(500).json({ error: 'Failed to fetch provinces' });
  }
});

/* ------------------------------------------------------------------ */
/*  GET /api/locations/districts?provinceId=X                          */
/* ------------------------------------------------------------------ */
router.get('/districts', async function (req, res) {
  try {
    var provinceId = req.query.provinceId;
    var where = { isActive: true };
    if (provinceId) where.provinceId = provinceId;

    var items = await prisma.district.findMany({
      where: where,
      orderBy: { displayOrder: 'asc' },
      select: { id: true, code: true, name: true, nameEn: true, nameRw: true, provinceId: true },
    });
    res.json({ items: items });
  } catch (err) {
    console.error('locations/districts error:', err);
    res.status(500).json({ error: 'Failed to fetch districts' });
  }
});

/* ------------------------------------------------------------------ */
/*  GET /api/locations/sectors?districtId=X                            */
/* ------------------------------------------------------------------ */
router.get('/sectors', async function (req, res) {
  try {
    var districtId = req.query.districtId;
    var where = { isActive: true };
    if (districtId) where.districtId = districtId;

    var items = await prisma.sector.findMany({
      where: where,
      orderBy: { displayOrder: 'asc' },
      select: { id: true, code: true, name: true, nameEn: true, nameRw: true, districtId: true },
    });
    res.json({ items: items });
  } catch (err) {
    console.error('locations/sectors error:', err);
    res.status(500).json({ error: 'Failed to fetch sectors' });
  }
});

/* ------------------------------------------------------------------ */
/*  GET /api/locations/cells?sectorId=X                                */
/* ------------------------------------------------------------------ */
router.get('/cells', async function (req, res) {
  try {
    var sectorId = req.query.sectorId;
    var where = { isActive: true };
    if (sectorId) where.sectorId = sectorId;

    var items = await prisma.cell.findMany({
      where: where,
      orderBy: { displayOrder: 'asc' },
      select: { id: true, code: true, name: true, nameEn: true, nameRw: true, sectorId: true },
    });
    res.json({ items: items });
  } catch (err) {
    console.error('locations/cells error:', err);
    res.status(500).json({ error: 'Failed to fetch cells' });
  }
});

/* ------------------------------------------------------------------ */
/*  GET /api/locations/villages?cellId=X                               */
/* ------------------------------------------------------------------ */
router.get('/villages', async function (req, res) {
  try {
    var cellId = req.query.cellId;
    var where = { isActive: true };
    if (cellId) where.cellId = cellId;

    var items = await prisma.village.findMany({
      where: where,
      orderBy: { displayOrder: 'asc' },
      select: { id: true, code: true, name: true, nameEn: true, nameRw: true, cellId: true },
    });
    res.json({ items: items });
  } catch (err) {
    console.error('locations/villages error:', err);
    res.status(500).json({ error: 'Failed to fetch villages' });
  }
});

/* ------------------------------------------------------------------ */
/*  GET /api/locations/search?q=X                                      */
/*  Searches across all levels, returns grouped results                */
/* ------------------------------------------------------------------ */
router.get('/search', async function (req, res) {
  try {
    var q = req.query.q;
    if (!q || String(q).trim().length < 2) {
      return res.json({ items: [] });
    }

    var term = String(q).trim();
    var contains = { contains: term, mode: 'insensitive' };

    var results = [];

    var provinces = await prisma.province.findMany({
      where: { isActive: true, name: contains },
      take: 10,
      select: { id: true, name: true, nameEn: true },
    });
    provinces.forEach(function (p) {
      results.push({ level: 'province', id: p.id, name: p.nameEn, label: p.nameEn });
    });

    var districts = await prisma.district.findMany({
      where: { isActive: true, name: contains },
      take: 15,
      select: { id: true, name: true, nameEn: true, province: { select: { nameEn: true } } },
    });
    districts.forEach(function (d) {
      results.push({ level: 'district', id: d.id, name: d.nameEn, label: d.nameEn + ', ' + d.province.nameEn });
    });

    var sectors = await prisma.sector.findMany({
      where: { isActive: true, name: contains },
      take: 15,
      select: { id: true, name: true, nameEn: true, district: { select: { nameEn: true, province: { select: { nameEn: true } } } } },
    });
    sectors.forEach(function (s) {
      results.push({ level: 'sector', id: s.id, name: s.nameEn, label: s.nameEn + ', ' + s.district.nameEn });
    });

    var cells = await prisma.cell.findMany({
      where: { isActive: true, name: contains },
      take: 10,
      select: { id: true, name: true, nameEn: true, sector: { select: { nameEn: true, district: { select: { nameEn: true } } } } },
    });
    cells.forEach(function (c) {
      results.push({ level: 'cell', id: c.id, name: c.nameEn, label: c.nameEn + ', ' + c.sector.nameEn });
    });

    var villages = await prisma.village.findMany({
      where: { isActive: true, name: contains },
      take: 10,
      select: { id: true, name: true, nameEn: true, cell: { select: { nameEn: true, sector: { select: { nameEn: true } } } } },
    });
    villages.forEach(function (v) {
      results.push({ level: 'village', id: v.id, name: v.nameEn, label: v.nameEn + ', ' + v.cell.nameEn });
    });

    res.json({ items: results });
  } catch (err) {
    console.error('locations/search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
