const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { requireAuth, requireActive } = require('../middleware/auth');

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Hardcoded question bank (fallback when DB has no questions yet)
// ---------------------------------------------------------------------------
const QUESTION_BANK = {
  mathematics: [
    { id: 'mat001', topic: 'Addition', difficulty: 'easy', text_en: 'What is 25 + 37?', text_rw: '25 + 37 ni iki?', options_en: ['52', '62', '72', '42'], options_rw: ['52', '62', '72', '42'], correct: 1, explanation_en: '25 + 37 = 62. Add the ones: 5+7=12, carry 1. Add the tens: 2+3+1=6.', explanation_rw: '25 + 37 = 62. Tera ibice: 5+7=12, twikubite 1.', subjectCode: 'MAT', level: 'P4' },
    { id: 'mat002', topic: 'Addition', difficulty: 'easy', text_en: 'What is 148 + 267?', text_rw: '148 + 267 ni iki?', options_en: ['415', '315', '405', '425'], options_rw: ['415', '315', '405', '425'], correct: 0, explanation_en: '148 + 267 = 415.', explanation_rw: '148 + 267 = 415.', subjectCode: 'MAT', level: 'P4' },
    { id: 'mat003', topic: 'Subtraction', difficulty: 'easy', text_en: 'What is 83 - 47?', text_rw: '83 - 47 ni iki?', options_en: ['36', '46', '26', '44'], options_rw: ['36', '46', '26', '44'], correct: 0, explanation_en: '83 - 47 = 36.', explanation_rw: '83 - 47 = 36.', subjectCode: 'MAT', level: 'P4' },
    { id: 'mat004', topic: 'Multiplication', difficulty: 'medium', text_en: 'What is 12 x 8?', text_rw: '12 x 8 ni iki?', options_en: ['86', '96', '106', '88'], options_rw: ['86', '96', '106', '88'], correct: 1, explanation_en: '12 x 8 = 96.', explanation_rw: '12 x 8 = 96.', subjectCode: 'MAT', level: 'P5' },
    { id: 'mat005', topic: 'Multiplication', difficulty: 'medium', text_en: 'What is 15 x 6?', text_rw: '15 x 6 ni iki?', options_en: ['80', '85', '90', '95'], options_rw: ['80', '85', '90', '95'], correct: 2, explanation_en: '15 x 6 = 90.', explanation_rw: '15 x 6 = 90.', subjectCode: 'MAT', level: 'P5' },
    { id: 'mat006', topic: 'Division', difficulty: 'medium', text_en: 'What is 144 / 12?', text_rw: '144 / 12 ni iki?', options_en: ['10', '11', '12', '14'], options_rw: ['10', '11', '12', '14'], correct: 2, explanation_en: '144 / 12 = 12.', explanation_rw: '144 / 12 = 12.', subjectCode: 'MAT', level: 'P5' },
    { id: 'mat007', topic: 'Fractions', difficulty: 'hard', text_en: 'What is 3/4 + 1/2?', text_rw: '3/4 + 1/2 ni iki?', options_en: ['5/4', '4/6', '1', '7/4'], options_rw: ['5/4', '4/6', '1', '7/4'], correct: 0, explanation_en: '3/4 + 1/2 = 5/4.', explanation_rw: '3/4 + 1/2 = 5/4.', subjectCode: 'MAT', level: 'P6' },
    { id: 'mat008', topic: 'Algebra', difficulty: 'hard', text_en: 'If 3x + 7 = 22, what is x?', text_rw: 'Niba 3x + 7 = 22, x ni iki?', options_en: ['3', '5', '7', '9'], options_rw: ['3', '5', '7', '9'], correct: 1, explanation_en: '3x + 7 = 22 → 3x = 15 → x = 5.', explanation_rw: '3x + 7 = 22 → 3x = 15 → x = 5.', subjectCode: 'MAT', level: 'S1' },
    { id: 'mat009', topic: 'Geometry', difficulty: 'medium', text_en: 'What is the area of a rectangle with length 8cm and width 5cm?', text_rw: 'Ubuso bw\'urukiramende rufite uburebure 8cm n\'ubugari 5cm ni ubuhe?', options_en: ['13 cm²', '26 cm²', '40 cm²', '80 cm²'], options_rw: ['13 cm²', '26 cm²', '40 cm²', '80 cm²'], correct: 2, explanation_en: 'Area = 8 x 5 = 40 cm².', explanation_rw: 'Ubuso = 8 x 5 = 40 cm².', subjectCode: 'MAT', level: 'P5' },
    { id: 'mat010', topic: 'Geometry', difficulty: 'hard', text_en: 'What is the volume of a cube with side 4cm?', text_rw: 'Ingano y\'ikibe gifite uruhande 4cm ni iyihe?', options_en: ['16 cm³', '48 cm³', '64 cm³', '96 cm³'], options_rw: ['16 cm³', '48 cm³', '64 cm³', '96 cm³'], correct: 2, explanation_en: 'Volume = 4³ = 64 cm³.', explanation_rw: 'Ingano = 4³ = 64 cm³.', subjectCode: 'MAT', level: 'S1' },
  ],
  science: [
    { id: 'sci001', topic: 'Living Things', difficulty: 'easy', text_en: 'What do plants need to make food?', text_rw: 'Ibimera bikeneye iki gukora ibiryo?', options_en: ['Sunlight, water, CO2', 'Darkness, sand', 'Only water', 'Only soil'], options_rw: ['Urumuri, amazi, CO2', 'Umwijima, umucanga', 'Amazi gusa', 'Ubutaka gusa'], correct: 0, explanation_en: 'Plants need sunlight, water, and CO2 for photosynthesis.', explanation_rw: 'Ibimera bikeneye urumuri, amazi, na CO2.', subjectCode: 'SCI', level: 'P4' },
    { id: 'sci002', topic: 'Living Things', difficulty: 'easy', text_en: 'Which animal is a mammal?', text_rw: 'Ni ikihe kiremwa ari inyamabere?', options_en: ['Snake', 'Fish', 'Dog', 'Frog'], options_rw: ['Inzoka', 'Amafi', 'Imbwa', 'Igikeri'], correct: 2, explanation_en: 'Dogs are mammals.', explanation_rw: 'Imbwa ni inyamabere.', subjectCode: 'SCI', level: 'P4' },
    { id: 'sci003', topic: 'Human Body', difficulty: 'medium', text_en: 'How many chambers does the human heart have?', text_rw: 'Umutima w\'umuntu ufite ibyumba bingahe?', options_en: ['2', '3', '4', '5'], options_rw: ['2', '3', '4', '5'], correct: 2, explanation_en: 'The human heart has 4 chambers.', explanation_rw: 'Umutima w\'umuntu ufite ibyumba 4.', subjectCode: 'SCI', level: 'P5' },
    { id: 'sci004', topic: 'Matter', difficulty: 'medium', text_en: 'What is the boiling point of water at sea level?', text_rw: 'Amazi atangira kubira kuri ikihe gipimo?', options_en: ['50°C', '80°C', '100°C', '120°C'], options_rw: ['50°C', '80°C', '100°C', '120°C'], correct: 2, explanation_en: 'Water boils at 100°C.', explanation_rw: 'Amazi abira kuri 100°C.', subjectCode: 'SCI', level: 'P6' },
    { id: 'sci005', topic: 'Energy', difficulty: 'hard', text_en: 'What type of energy does a moving car have?', text_rw: 'Imodoka igenda ifite ubwoko bwingihe bw\'ingufu?', options_en: ['Potential energy', 'Kinetic energy', 'Chemical energy', 'Nuclear energy'], options_rw: ['Ingufu z\'ububiko', 'Ingufu z\'umuvuduko', 'Ingufu z\'imiti', 'Ingufu za nikleyeri'], correct: 1, explanation_en: 'A moving car has kinetic energy.', explanation_rw: 'Imodoka igenda ifite ingufu z\'umuvuduko.', subjectCode: 'SCI', level: 'S1' },
    { id: 'sci006', topic: 'Earth Science', difficulty: 'medium', text_en: 'What layer of Earth do we live on?', text_rw: 'Ni iyihe layer y\'isi tubaho?', options_en: ['Core', 'Mantle', 'Crust', 'Atmosphere'], options_rw: ['Umutima', 'Mantle', 'Igishishwa', 'Ikirere'], correct: 2, explanation_en: 'We live on the Earth\'s crust.', explanation_rw: 'Tubaho ku gishishwa cy\'isi.', subjectCode: 'SCI', level: 'P5' },
  ],
  english: [
    { id: 'eng001', topic: 'Grammar', difficulty: 'easy', text_en: 'Which word is a noun?', text_rw: 'Ni irihe jambo ari izina?', options_en: ['Run', 'Beautiful', 'Book', 'Quickly'], options_rw: ['Gukora', 'Kwiza', 'Igitabo', 'Vuba'], correct: 2, explanation_en: '"Book" is a noun.', explanation_rw: '"Igitabo" ni izina.', subjectCode: 'ENG', level: 'P4' },
    { id: 'eng002', topic: 'Grammar', difficulty: 'easy', text_en: 'What is the plural of "child"?', text_rw: 'Ikinyuranyo cya "child" ni iki?', options_en: ['Childs', 'Children', 'Childes', 'Childern'], options_rw: ['Childs', 'Children', 'Childes', 'Childern'], correct: 1, explanation_en: '"Children" is the irregular plural of "child".', explanation_rw: '"Children" ni ubwinshi bwa "child".', subjectCode: 'ENG', level: 'P4' },
    { id: 'eng003', topic: 'Vocabulary', difficulty: 'medium', text_en: 'What does "enormous" mean?', text_rw: '"Enormous" bivuga iki?', options_en: ['Tiny', 'Very large', 'Fast', 'Colorful'], options_rw: ['Gito cyane', 'Kinini cyane', 'Byihuta', 'Bifite amabara'], correct: 1, explanation_en: '"Enormous" means extremely large.', explanation_rw: '"Enormous" bivuga kinini cyane.', subjectCode: 'ENG', level: 'P5' },
    { id: 'eng004', topic: 'Comprehension', difficulty: 'medium', text_en: 'What is a synonym for "brave"?', text_rw: 'Ni irihe jambo risobanura "brave"?', options_en: ['Cowardly', 'Courageous', 'Lazy', 'Angry'], options_rw: ['Igikora', 'Intwari', 'Umunebwe', 'Urakariye'], correct: 1, explanation_en: '"Courageous" is a synonym for "brave".', explanation_rw: '"Courageous" ni insobanuro imwe na "brave".', subjectCode: 'ENG', level: 'P5' },
    { id: 'eng005', topic: 'Writing', difficulty: 'hard', text_en: 'Which sentence uses correct punctuation?', text_rw: 'Ni iyihe nteruro ikoresha utumenyetso tw\'andika neza?', options_en: ['Its a beautiful day', 'It\'s a beautiful day.', 'Its a beautiful day.', 'It\'s a beautiful day'], options_rw: ['Its a beautiful day', 'It\'s a beautiful day.', 'Its a beautiful day.', 'It\'s a beautiful day'], correct: 1, explanation_en: '"It\'s" needs an apostrophe and the sentence needs a period.', explanation_rw: '"It\'s" ikeneye agace n\'akadomo.', subjectCode: 'ENG', level: 'P6' },
  ],
  kinyarwanda: [
    { id: 'kin001', topic: 'Ivugajambo', difficulty: 'easy', text_en: 'Fill in: "Umwana ___ amazi."', text_rw: 'Ishyiramo ijambo ribereye: "Umwana ___ amazi."', options_en: ['Anywa', 'Arya', 'Asoma', 'Akorana'], options_rw: ['Anywa', 'Arya', 'Asoma', 'Akorana'], correct: 0, explanation_en: '"Anywa" means drinks.', explanation_rw: '"Anywa" bivuga kunywa.', subjectCode: 'KIN', level: 'P4' },
    { id: 'kin002', topic: 'Ivugajambo', difficulty: 'easy', text_en: 'Which is a noun?', text_rw: 'Ni izina irihe muri izi?', options_en: ['Gukora', 'Kwiza', 'Igitabo', 'Vuba'], options_rw: ['Gukora', 'Kwiza', 'Igitabo', 'Vuba'], correct: 2, explanation_en: '"Igitabo" is a noun.', explanation_rw: '"Igitabo" ni izina.', subjectCode: 'KIN', level: 'P4' },
    { id: 'kin003', topic: 'Imvugo', difficulty: 'medium', text_en: '"U Rwanda ni rwigare" is what?', text_rw: '"U Rwanda ni rwigare" ni iki?', options_en: ['Umugani', 'Proverb', 'Indirimbo', 'Igisakuzo'], options_rw: ['Umugani', 'Umugani mugari', 'Indirimbo', 'Igisakuzo'], correct: 1, explanation_en: 'This is a Kinyarwanda proverb.', explanation_rw: 'Uyu ni umugani w\'Ikinyarwanda.', subjectCode: 'KIN', level: 'P5' },
  ],
  socialStudies: [
    { id: 'sst001', topic: 'Rwanda Geography', difficulty: 'easy', text_en: 'What is the capital city of Rwanda?', text_rw: 'Umujyi mukuru w\'u Rwanda ni uwuhe?', options_en: ['Butare', 'Gisenyi', 'Kigali', 'Ruhengeri'], options_rw: ['Butare', 'Gisenyi', 'Kigali', 'Ruhengeri'], correct: 2, explanation_en: 'Kigali is the capital of Rwanda.', explanation_rw: 'Kigali ni wo mujyi mukuru w\'u Rwanda.', subjectCode: 'SST', level: 'P4' },
    { id: 'sst002', topic: 'Rwanda Geography', difficulty: 'easy', text_en: 'How many provinces does Rwanda have?', text_rw: 'Intara z\'u Rwanda ni zingahe?', options_en: ['3', '4', '5', '6'], options_rw: ['3', '4', '5', '6'], correct: 2, explanation_en: 'Rwanda has 5 provinces.', explanation_rw: 'U Rwanda rufite intara 5.', subjectCode: 'SST', level: 'P5' },
    { id: 'sst003', topic: 'History', difficulty: 'medium', text_en: 'When did Rwanda gain independence?', text_rw: 'U Rwanda rwabonye ubwigenge ryari?', options_en: ['1959', '1962', '1970', '1994'], options_rw: ['1959', '1962', '1970', '1994'], correct: 1, explanation_en: 'Rwanda gained independence on July 1, 1962.', explanation_rw: 'U Rwanda rwabonye ubwigenge ku ya 1 Nyakanga 1962.', subjectCode: 'SST', level: 'P6' },
    { id: 'sst004', topic: 'Civics', difficulty: 'medium', text_en: 'What are the official languages of Rwanda?', text_rw: 'Indimi zemewe mu Rwanda ni izihe?', options_en: ['Kinyarwanda only', 'Kinyarwanda and French', 'Kinyarwanda, French, English', 'Kinyarwanda, English, French, Swahili'], options_rw: ['Ikinyarwanda gusa', 'Ikinyarwanda n\'Igifaransa', 'Ikinyarwanda, Igifaransa, Icyongereza', 'Ikinyarwanda, Icyongereza, Igifaransa, Igiswahili'], correct: 3, explanation_en: 'Rwanda has 4 official languages.', explanation_rw: 'U Rwanda rufite indimi 4 zemewe.', subjectCode: 'SST', level: 'S1' },
  ],
  physics: [
    { id: 'phy001', topic: 'Mechanics', difficulty: 'medium', text_en: 'What is the unit of force?', text_rw: 'Igipimo cy\'imbaraga ni ikihe?', options_en: ['Joule', 'Newton', 'Watt', 'Pascal'], options_rw: ['Joule', 'Newton', 'Watt', 'Pascal'], correct: 1, explanation_en: 'The unit of force is Newton (N).', explanation_rw: 'Igipimo cy\'imbaraga ni Newton (N).', subjectCode: 'PHY', level: 'S4' },
    { id: 'phy002', topic: 'Mechanics', difficulty: 'medium', text_en: 'What is the acceleration due to gravity on Earth?', text_rw: 'Umuvuduko w\'imbaraga z\'isi ni uwuhe?', options_en: ['9.8 m/s²', '10.8 m/s²', '8.9 m/s²', '11 m/s²'], options_rw: ['9.8 m/s²', '10.8 m/s²', '8.9 m/s²', '11 m/s²'], correct: 0, explanation_en: 'Gravity on Earth ≈ 9.8 m/s².', explanation_rw: 'Imbaraga z\'isi ≈ 9.8 m/s².', subjectCode: 'PHY', level: 'S4' },
    { id: 'phy003', topic: 'Electricity', difficulty: 'hard', text_en: 'What is Ohm\'s Law?', text_rw: 'Itegeko rya Ohm ni irihe?', options_en: ['V = IR', 'V = I/R', 'V = I+R', 'V = I-R'], options_rw: ['V = IR', 'V = I/R', 'V = I+R', 'V = I-R'], correct: 0, explanation_en: 'Ohm\'s Law: V = IR.', explanation_rw: 'Itegeko rya Ohm: V = IR.', subjectCode: 'PHY', level: 'S5' },
  ],
  chemistry: [
    { id: 'che001', topic: 'Atomic Structure', difficulty: 'medium', text_en: 'What is the atomic number of Carbon?', text_rw: 'Nomero ya atome ya Karubone ni iyihe?', options_en: ['4', '6', '8', '12'], options_rw: ['4', '6', '8', '12'], correct: 1, explanation_en: 'Carbon has atomic number 6.', explanation_rw: 'Karubone ifite nomero ya atome 6.', subjectCode: 'CHE', level: 'S4' },
    { id: 'che002', topic: 'Periodic Table', difficulty: 'medium', text_en: 'What is the chemical symbol for Gold?', text_rw: 'Ikimenyetso cy\'ubutabire cya Zahabu ni ikihe?', options_en: ['Go', 'Gd', 'Au', 'Ag'], options_rw: ['Go', 'Gd', 'Au', 'Ag'], correct: 2, explanation_en: 'Gold\'s symbol is Au (from Latin "aurum").', explanation_rw: 'Ikimenyetso cya Zahabu ni Au.', subjectCode: 'CHE', level: 'S4' },
  ],
  biology: [
    { id: 'bio001', topic: 'Cell Biology', difficulty: 'medium', text_en: 'What is the powerhouse of the cell?', text_rw: 'Ni ikihe gice cy\'ingufu z\'akaremangingo?', options_en: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi body'], options_rw: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi body'], correct: 2, explanation_en: 'Mitochondria produce ATP.', explanation_rw: 'Mitochondria ikora ATP.', subjectCode: 'BIO', level: 'S4' },
    { id: 'bio002', topic: 'Genetics', difficulty: 'hard', text_en: 'What molecule carries genetic information?', text_rw: 'Ni iyihe molecule itwara amakuru y\'uruhererekane?', options_en: ['RNA', 'DNA', 'Protein', 'Lipid'], options_rw: ['RNA', 'DNA', 'Proteyine', 'Lipide'], correct: 1, explanation_en: 'DNA carries genetic instructions.', explanation_rw: 'DNA itwara amabwiriza y\'uruhererekane.', subjectCode: 'BIO', level: 'S5' },
  ],
  french: [
    { id: 'fre001', topic: 'Vocabulaire', difficulty: 'easy', text_en: 'What is "book" in French?', text_rw: '"Igitabo" mu Gifaransa ni iki?', options_en: ['Le livre', 'La maison', 'Le crayon', 'L\'école'], options_rw: ['Le livre', 'La maison', 'Le crayon', 'L\'école'], correct: 0, explanation_en: '"Book" in French is "le livre".', explanation_rw: '"Igitabo" mu Gifaransa ni "le livre".', subjectCode: 'FRE', level: 'P5' },
    { id: 'fre002', topic: 'Grammaire', difficulty: 'medium', text_en: 'What is the correct form? "Je ___ étudiant."', text_rw: 'Ni iyihe form ikwiye? "Je ___ étudiant."', options_en: ['suis', 'es', 'est', 'sommes'], options_rw: ['suis', 'es', 'est', 'sommes'], correct: 0, explanation_en: '"Je suis" is first person singular of "être".', explanation_rw: '"Je suis" ni umuntu wa mbere wa "être".', subjectCode: 'FRE', level: 'S1' },
  ],
  geography: [
    { id: 'geo001', topic: 'Physical Geography', difficulty: 'medium', text_en: 'What is the longest river in Africa?', text_rw: 'Ni uruhe ruzi rurerure muri Afurika?', options_en: ['Congo', 'Nile', 'Niger', 'Zambezi'], options_rw: ['Kongo', 'Nili', 'Nijeri', 'Zambezi'], correct: 1, explanation_en: 'The Nile is the longest river in Africa.', explanation_rw: 'Nili ni rwo ruzi rurerure muri Afurika.', subjectCode: 'GEO', level: 'S4' },
  ],
  computerScience: [
    { id: 'com001', topic: 'Programming Basics', difficulty: 'easy', text_en: 'What does HTML stand for?', text_rw: 'HTML isobanura iki?', options_en: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Hyper Transfer Markup Language', 'Home Tool Markup Language'], options_rw: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Hyper Transfer Markup Language', 'Home Tool Markup Language'], correct: 0, explanation_en: 'HTML = HyperText Markup Language.', explanation_rw: 'HTML = HyperText Markup Language.', subjectCode: 'COM', level: 'S4' },
    { id: 'com002', topic: 'Data Structures', difficulty: 'hard', text_en: 'What data structure uses FIFO?', text_rw: 'Ni iyihe structure y\'amakuru ikoresha FIFO?', options_en: ['Stack', 'Queue', 'Tree', 'Graph'], options_rw: ['Stack', 'Queue', 'Tree', 'Graph'], correct: 1, explanation_en: 'A Queue uses FIFO.', explanation_rw: 'Queue ikoresha FIFO.', subjectCode: 'COM', level: 'S5' },
  ],
};

const SUBJECT_KEY_MAP = {
  MAT: 'mathematics', SCI: 'science', ENG: 'english', KIN: 'kinyarwanda',
  SST: 'socialStudies', PHY: 'physics', CHE: 'chemistry', BIO: 'biology',
  FRE: 'french', GEO: 'geography', COM: 'computerScience', HIS: 'history',
};

function getQuestionsFromBank(subjectCode, level, topic, difficulty, count) {
  var key = SUBJECT_KEY_MAP[subjectCode] || subjectCode;
  var bank = QUESTION_BANK[key];
  if (!bank) {
    var allKeys = Object.keys(QUESTION_BANK);
    bank = [];
    for (var i = 0; i < allKeys.length; i++) {
      bank = bank.concat(QUESTION_BANK[allKeys[i]]);
    }
  }

  var filtered = bank.filter(function (q) {
    if (level && q.level !== level) return false;
    if (topic && topic !== 'all' && q.topic !== topic) return false;
    if (difficulty && difficulty !== 'adaptive' && q.difficulty !== difficulty) return false;
    return true;
  });

  if (filtered.length === 0) filtered = bank;

  var shuffled = filtered.slice().sort(function () { return Math.random() - 0.5; });
  return shuffled.slice(0, count || 10);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shuffleArray(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

async function getStudentLevel(userId) {
  var profile = await prisma.studentProfile.findUnique({
    where: { userId: userId },
    include: {
      currentEducationLevel: { select: { id: true, name: true, code: true } },
    },
  });
  if (!profile) return null;

  var enrollment = await prisma.studentEnrollment.findFirst({
    where: { studentProfileId: profile.id, status: 'active' },
    orderBy: { enrollmentDate: 'desc' },
    include: {
      educationLevel: { select: { id: true, name: true, code: true } },
    },
  });

  return {
    level: enrollment ? enrollment.educationLevel : profile.currentEducationLevel,
    grade: profile.currentGrade,
    profileId: profile.id,
  };
}

// ---------------------------------------------------------------------------
// GET /questions — Fetch questions for a game round
// ---------------------------------------------------------------------------
router.get('/questions', requireAuth, async function (req, res) {
  try {
    var subjectCode = req.query.subjectCode || req.query.subject || 'MAT';
    var level = req.query.level || '';
    var topic = req.query.topic || 'all';
    var difficulty = req.query.difficulty || 'adaptive';
    var count = Math.min(parseInt(req.query.count, 10) || 10, 20);

    // Try DB questions first
    var dbQuestions = [];
    try {
      var subject = await prisma.subject.findFirst({
        where: { code: subjectCode },
        select: { id: true },
      });

      if (subject) {
        var where = {
          questionBank: { subjectId: subject.id },
          isActive: true,
        };
        if (difficulty && difficulty !== 'adaptive') {
          where.difficulty = difficulty;
        }

        dbQuestions = await prisma.question.findMany({
          where: where,
          include: {
            questionOptions: {
              orderBy: { optionOrder: 'asc' },
              select: { id: true, optionText: true, optionTextEn: true, optionTextRw: true, isCorrect: true, optionOrder: true },
            },
          },
          take: count * 2,
        });
      }
    } catch (e) {
      // DB query failed, fall through to hardcoded bank
    }

    if (dbQuestions.length >= count) {
      var selected = shuffleArray(dbQuestions).slice(0, count);
      var formatted = selected.map(function (q, idx) {
        var options = q.questionOptions.map(function (o) {
          return o.optionTextEn || o.optionText;
        });
        var correctIdx = q.questionOptions.findIndex(function (o) { return o.isCorrect; });
        return {
          id: q.id,
          index: idx,
          topic: topic,
          difficulty: q.difficulty,
          text_en: q.questionTextEn || q.questionText,
          text_rw: q.questionTextRw || q.questionText,
          options_en: options,
          options_rw: options,
          correct: correctIdx >= 0 ? correctIdx : 0,
          explanation_en: q.explanationEn || q.explanation || '',
          explanation_rw: q.explanationRw || q.explanation || '',
          subjectCode: subjectCode,
          level: level,
          points: q.difficulty === 'hard' ? 3 : q.difficulty === 'medium' ? 2 : 1,
        };
      });
      return res.json({ questions: formatted, source: 'database' });
    }

    // Fallback to hardcoded bank
    var bankQuestions = getQuestionsFromBank(subjectCode, level, topic, difficulty, count);
    res.json({ questions: bankQuestions, source: 'bank' });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// ---------------------------------------------------------------------------
// POST /find-match — Find or create a match for the player
// ---------------------------------------------------------------------------
router.post('/find-match', requireAuth, requireActive, async function (req, res) {
  try {
    var userId = req.user.id;
    var { subject, subjectCode, subjectName, level, pathway, topic, difficulty, mode, totalRounds } = req.body;

    if (!subject && !subjectCode) {
      return res.status(400).json({ error: 'subject or subjectCode is required' });
    }

    var rounds = Math.min(totalRounds || 5, 10);

    // Try to find a waiting lobby with matching criteria
    var lobby = await prisma.gameLobby.findFirst({
      where: {
        status: 'waiting',
        currentPlayers: { lt: 2 },
        hostId: { not: userId },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        gamePlayers: {
          include: { user: { select: { id: true, fullName: true, email: true } } },
        },
      },
    });

    var opponent;
    var match;

    if (lobby && lobby.gamePlayers.length > 0) {
      // Join existing lobby
      opponent = lobby.gamePlayers[0].user;

      // Create the match
      match = await prisma.gameMatch.create({
        data: {
          player1Id: opponent.id,
          player2Id: userId,
          subjectName: subjectName || subject || subjectCode,
          level: level || '',
          pathway: pathway || '',
          topic: topic || 'all',
          difficulty: difficulty || 'adaptive',
          mode: mode || 'quick',
          totalRounds: rounds,
          status: 'active',
          currentRound: 0,
        },
      });

      // Update lobby
      await prisma.gameLobby.update({
        where: { id: lobby.id },
        data: { status: 'playing', currentPlayers: 2, startedAt: new Date() },
      });

      // Create game players
      await prisma.gamePlayer.createMany({
        data: [
          { gameMatchId: match.id, userId: opponent.id, playerNumber: 1 },
          { gameMatchId: match.id, userId: userId, playerNumber: 2 },
        ],
      });
    } else {
      // No lobby found — create a new one and simulate opponent
      var newLobby = await prisma.gameLobby.create({
        data: {
          gameModeId: null,
          hostId: userId,
          difficulty: difficulty || 'adaptive',
          status: 'waiting',
          maxPlayers: 2,
          currentPlayers: 1,
        },
      });

      await prisma.gamePlayer.create({
        data: {
          gameLobbyId: newLobby.id,
          userId: userId,
          playerNumber: 1,
        },
      });

      // Generate a simulated opponent
      var opponentNames = ['Mugisha Jean', 'Uwase Marie', 'Ishimwe Patrick', 'Niyonzima Diane', 'Habimana Eric', 'Uwimana Grace', 'Mukiza Aline', 'Ndayisaba Thierry'];
      var oppName = opponentNames[Math.floor(Math.random() * opponentNames.length)];

      // Create match with simulated opponent (player2Id stays null for AI/bot)
      match = await prisma.gameMatch.create({
        data: {
          player1Id: userId,
          subjectName: subjectName || subject || subjectCode,
          level: level || '',
          pathway: pathway || '',
          topic: topic || 'all',
          difficulty: difficulty || 'adaptive',
          mode: mode || 'quick',
          totalRounds: rounds,
          status: 'active',
          currentRound: 0,
        },
      });

      await prisma.gamePlayer.create({
        data: {
          gameMatchId: match.id,
          userId: userId,
          playerNumber: 1,
        },
      });

      // Update lobby to playing
      await prisma.gameLobby.update({
        where: { id: newLobby.id },
        data: { status: 'playing', startedAt: new Date() },
      });

      opponent = {
        id: 'bot-' + match.id,
        fullName: oppName,
        isBot: true,
      };
    }

    // Fetch questions for the match
    var code = subjectCode || subject;
    var questions = getQuestionsFromBank(code, level, topic, difficulty, rounds);

    res.status(201).json({
      match: {
        id: match.id,
        status: match.status,
        subject: match.subjectName,
        level: match.level,
        topic: match.topic,
        difficulty: match.difficulty,
        totalRounds: match.totalRounds,
        currentRound: 0,
        player1Score: 0,
        player2Score: 0,
      },
      opponent: {
        id: opponent.id,
        name: opponent.fullName || opponent.name || 'Opponent',
        initials: (opponent.fullName || 'OP').split(' ').map(function (n) { return n[0]; }).join('').slice(0, 2).toUpperCase(),
        isBot: !!opponent.isBot,
      },
      questions: questions,
    });
  } catch (error) {
    console.error('Find match error:', error);
    res.status(500).json({ error: 'Failed to find match' });
  }
});

// ---------------------------------------------------------------------------
// GET /matches/:id — Get match state
// ---------------------------------------------------------------------------
router.get('/matches/:id', requireAuth, async function (req, res) {
  try {
    var match = await prisma.gameMatch.findUnique({
      where: { id: req.params.id },
      include: {
        gameAnswers: {
          orderBy: { roundNumber: 'asc' },
        },
        gamePlayers: {
          include: { user: { select: { id: true, fullName: true, email: true } } },
        },
      },
    });

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (match.player1Id !== req.user.id && match.player2Id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view this match' });
    }

    var playerNumber = match.player1Id === req.user.id ? 1 : 2;
    var opponentPlayer = match.gamePlayers.find(function (p) { return p.playerNumber !== playerNumber; });

    res.json({
      match: {
        id: match.id,
        status: match.status,
        subject: match.subjectName,
        level: match.level,
        topic: match.topic,
        difficulty: match.difficulty,
        mode: match.mode,
        totalRounds: match.totalRounds,
        currentRound: match.currentRound,
        player1Score: match.player1Score,
        player2Score: match.player2Score,
        player1Accuracy: match.player1Accuracy,
        player2Accuracy: match.player2Accuracy,
        result: match.result,
        startedAt: match.startedAt,
        completedAt: match.completedAt,
      },
      playerNumber: playerNumber,
      myScore: playerNumber === 1 ? match.player1Score : match.player2Score,
      opponentScore: playerNumber === 1 ? match.player2Score : match.player1Score,
      opponent: opponentPlayer ? {
        id: opponentPlayer.user.id,
        name: opponentPlayer.user.fullName,
        score: opponentPlayer.score,
        accuracy: opponentPlayer.accuracy,
      } : null,
      answers: match.gameAnswers,
    });
  } catch (error) {
    console.error('Get match error:', error);
    res.status(500).json({ error: 'Failed to fetch match' });
  }
});

// ---------------------------------------------------------------------------
// POST /matches/:id/answer — Submit answer for a round
// ---------------------------------------------------------------------------
router.post('/matches/:id/answer', requireAuth, requireActive, async function (req, res) {
  try {
    var matchId = req.params.id;
    var userId = req.user.id;
    var { questionId, roundNumber, selectedAnswer, isCorrect, points, timeUsed } = req.body;

    var match = await prisma.gameMatch.findUnique({
      where: { id: matchId },
      include: { gameAnswers: { where: { userId: userId } } },
    });

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    if (match.player1Id !== userId && match.player2Id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (match.status !== 'active') {
      return res.status(400).json({ error: 'Match is not active' });
    }

    var isP1 = match.player1Id === userId;
    var playerCorrect = !!isCorrect;
    var playerPoints = points || (playerCorrect ? (match.difficulty === 'hard' ? 3 : match.difficulty === 'medium' ? 2 : 1) : 0);

    // Simulate opponent answer
    var oppCorrect = Math.random() > 0.4;
    var oppPoints = oppCorrect ? playerPoints : 0;

    // Save player answer
    await prisma.gameAnswer.create({
      data: {
        gameMatchId: matchId,
        userId: userId,
        questionId: questionId || 'unknown',
        roundNumber: roundNumber || match.currentRound + 1,
        selectedAnswer: typeof selectedAnswer === 'number' ? selectedAnswer : null,
        isCorrect: playerCorrect,
        points: playerPoints,
        timeUsed: timeUsed || 0,
      },
    });

    // Update scores
    var newP1Score = isP1 ? match.player1Score + playerPoints : match.player1Score + oppPoints;
    var newP2Score = isP1 ? match.player2Score + oppPoints : match.player2Score + playerPoints;
    var newRound = match.currentRound + 1;
    var isLastRound = newRound >= match.totalRounds;

    var updateData = {
      currentRound: newRound,
      player1Score: newP1Score,
      player2Score: newP2Score,
    };

    if (isLastRound) {
      updateData.status = 'completed';
      updateData.completedAt = new Date();
      updateData.result = newP1Score > newP2Score ? 'win' : newP1Score === newP2Score ? 'draw' : 'loss';
      var maxPossible = match.totalRounds * 3;
      updateData.player1Accuracy = maxPossible > 0 ? Math.round((newP1Score / maxPossible) * 100) : 0;
      updateData.player2Accuracy = maxPossible > 0 ? Math.round((newP2Score / maxPossible) * 100) : 0;

      // Update lobby status if linked
      if (match.gameLobbyId) {
        await prisma.gameLobby.update({
          where: { id: match.gameLobbyId },
          data: { status: 'completed' },
        });
      }
    }

    var updatedMatch = await prisma.gameMatch.update({
      where: { id: matchId },
      data: updateData,
    });

    // Update game player stats
    var myPlayer = await prisma.gamePlayer.findFirst({
      where: { gameMatchId: matchId, userId: userId },
    });
    if (myPlayer) {
      await prisma.gamePlayer.update({
        where: { id: myPlayer.id },
        data: {
          score: isP1 ? newP1Score : newP2Score,
          correctAnswers: { increment: playerCorrect ? 1 : 0 },
          wrongAnswers: { increment: playerCorrect ? 0 : 1 },
        },
      });
    }

    var winner = null;
    if (isLastRound) {
      if (newP1Score > newP2Score) {
        winner = { playerId: match.player1Id, score: newP1Score };
      } else if (newP2Score > newP1Score) {
        winner = { playerId: match.player2Id, score: newP2Score };
      }
    }

    res.json({
      round: newRound,
      totalRounds: match.totalRounds,
      isCorrect: playerCorrect,
      points: playerPoints,
      opponentCorrect: oppCorrect,
      opponentPoints: oppPoints,
      player1Score: newP1Score,
      player2Score: newP2Score,
      isCompleted: isLastRound,
      result: isLastRound ? updatedMatch.result : null,
      winner: winner,
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

// ---------------------------------------------------------------------------
// POST /matches/:id/complete — Complete match with full results (client-side game)
// ---------------------------------------------------------------------------
router.post('/matches/:id/complete', requireAuth, requireActive, async function (req, res) {
  try {
    var matchId = req.params.id;
    var userId = req.user.id;
    var { playerScore, opponentScore, answers, opponentName } = req.body;

    var match = await prisma.gameMatch.findUnique({ where: { id: matchId } });
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (match.player1Id !== userId) return res.status(403).json({ error: 'Not authorized' });

    var p1Score = playerScore || 0;
    var p2Score = opponentScore || 0;
    var maxPossible = (match.totalRounds || 10) * 3;
    var accuracy = maxPossible > 0 ? Math.round((p1Score / maxPossible) * 100) : 0;
    var result = p1Score > p2Score ? 'win' : p1Score === p2Score ? 'draw' : 'loss';

    var updated = await prisma.gameMatch.update({
      where: { id: matchId },
      data: {
        player1Score: p1Score,
        player2Score: p2Score,
        player1Accuracy: accuracy,
        result: result,
        status: 'completed',
        completedAt: new Date(),
      },
    });

    // Save individual answers
    if (answers && answers.length > 0) {
      await prisma.gameAnswer.createMany({
        data: answers.map(function (a, idx) {
          return {
            gameMatchId: matchId,
            userId: userId,
            questionId: a.questionId || 'unknown',
            roundNumber: a.roundNumber || idx + 1,
            selectedAnswer: typeof a.selectedAnswer === 'number' ? a.selectedAnswer : null,
            isCorrect: !!a.isCorrect,
            points: a.points || 0,
            timeUsed: a.timeUsed || 0,
          };
        }),
      });
    }

    res.json({
      match: {
        id: updated.id,
        result: result,
        playerScore: p1Score,
        opponentScore: p2Score,
        accuracy: accuracy,
        subject: match.subjectName,
        level: match.level,
        completedAt: updated.completedAt,
      },
    });
  } catch (error) {
    console.error('Complete match error:', error);
    res.status(500).json({ error: 'Failed to complete match' });
  }
});

// ---------------------------------------------------------------------------
// POST /match — Save a complete match (legacy, backward compatible)
// ---------------------------------------------------------------------------
router.post('/match', requireAuth, requireActive, async (req, res) => {
  try {
    const {
      subject, subjectName, level, pathway, topic, difficulty, mode,
      totalRounds, playerScore, opponentScore, opponentName, answers,
    } = req.body;

    if (!subject || !level || !pathway) {
      return res.status(400).json({ error: 'subject, level, and pathway are required' });
    }

    const player1Accuracy = totalRounds > 0
      ? Math.round(((playerScore || 0) / (totalRounds * 3)) * 100) : 0;

    const result = (playerScore || 0) > (opponentScore || 0) ? 'win'
      : (playerScore || 0) === (opponentScore || 0) ? 'draw' : 'loss';

    const match = await prisma.gameMatch.create({
      data: {
        player1Id: req.user.id,
        player1Score: playerScore || 0,
        player2Score: opponentScore || 0,
        subjectName: subjectName || subject,
        level,
        pathway,
        topic: topic || 'all',
        difficulty: difficulty || 'adaptive',
        mode: mode || 'quick',
        totalRounds: totalRounds || 10,
        result,
        status: 'completed',
        player1Accuracy,
        completedAt: new Date(),
        gameAnswers: answers && answers.length > 0 ? {
          create: answers.map((a, idx) => ({
            userId: req.user.id,
            questionId: a.questionId || 'unknown',
            roundNumber: a.roundNumber || idx + 1,
            selectedAnswer: typeof a.selectedAnswer === 'number' ? a.selectedAnswer : null,
            answerText: typeof a.selectedAnswer === 'string' ? a.selectedAnswer : null,
            isCorrect: !!a.isCorrect,
            points: a.points || 0,
            timeUsed: a.timeUsed || 0,
          })),
        } : undefined,
      },
      include: { gameAnswers: true },
    });

    res.status(201).json({
      message: 'Match saved successfully',
      match: {
        id: match.id,
        result: match.result,
        playerScore: match.player1Score,
        opponentScore: match.player2Score,
        accuracy: match.player1Accuracy,
        subject: match.subjectName,
        level: match.level,
        completedAt: match.completedAt,
      },
    });
  } catch (error) {
    console.error('Save match error:', error);
    res.status(500).json({ error: 'Failed to save match' });
  }
});

// ---------------------------------------------------------------------------
// GET /history — Get user's match history
// ---------------------------------------------------------------------------
router.get('/history', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [matches, total] = await Promise.all([
      prisma.gameMatch.findMany({
        where: {
          OR: [
            { player1Id: req.user.id },
            { player2Id: req.user.id },
          ],
        },
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true, subjectId: true, subjectName: true, level: true,
          pathway: true, topic: true, difficulty: true, mode: true,
          player1Score: true, player2Score: true, result: true,
          player1Accuracy: true, totalRounds: true, startedAt: true, completedAt: true,
        },
      }),
      prisma.gameMatch.count({
        where: {
          OR: [
            { player1Id: req.user.id },
            { player2Id: req.user.id },
          ],
        },
      }),
    ]);

    res.json({
      matches,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to fetch match history' });
  }
});

// ---------------------------------------------------------------------------
// GET /stats — Get user's game statistics
// ---------------------------------------------------------------------------
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [totalMatches, wins, draws, losses, avgAccuracy] = await Promise.all([
      prisma.gameMatch.count({ where: { player1Id: userId } }),
      prisma.gameMatch.count({ where: { player1Id: userId, result: 'win' } }),
      prisma.gameMatch.count({ where: { player1Id: userId, result: 'draw' } }),
      prisma.gameMatch.count({ where: { player1Id: userId, result: 'loss' } }),
      prisma.gameMatch.aggregate({
        where: { player1Id: userId, player1Accuracy: { not: null } },
        _avg: { player1Accuracy: true },
      }),
    ]);

    const subjectStats = await prisma.gameMatch.groupBy({
      by: ['subjectName'],
      where: { player1Id: userId },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    res.json({
      totalMatches,
      wins,
      draws,
      losses,
      winRate: totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0,
      averageAccuracy: avgAccuracy._avg.player1Accuracy
        ? Math.round(avgAccuracy._avg.player1Accuracy) : 0,
      topSubjects: subjectStats
        .filter(s => s.subjectName)
        .map(s => ({ subject: s.subjectName, matches: s._count.id })),
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ---------------------------------------------------------------------------
// GET /leaderboard — Top players by win rate
// ---------------------------------------------------------------------------
router.get('/leaderboard', requireAuth, async function (req, res) {
  try {
    var limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

    var matches = await prisma.gameMatch.findMany({
      where: { status: 'completed', result: { not: null } },
      select: {
        player1Id: true,
        result: true,
        player1Score: true,
        player1Accuracy: true,
        player1: { select: { id: true, fullName: true } },
      },
    });

    var playerMap = {};
    matches.forEach(function (m) {
      if (!playerMap[m.player1Id]) {
        playerMap[m.player1Id] = {
          userId: m.player1Id,
          name: m.player1 ? m.player1.fullName : 'Player',
          matches: 0,
          wins: 0,
          totalScore: 0,
          totalAccuracy: 0,
          accuracyCount: 0,
        };
      }
      var p = playerMap[m.player1Id];
      p.matches++;
      if (m.result === 'win') p.wins++;
      p.totalScore += m.player1Score || 0;
      if (m.player1Accuracy != null) {
        p.totalAccuracy += m.player1Accuracy;
        p.accuracyCount++;
      }
    });

    var leaderboard = Object.values(playerMap)
      .map(function (p) {
        return {
          userId: p.userId,
          name: p.name,
          matches: p.matches,
          wins: p.wins,
          winRate: p.matches > 0 ? Math.round((p.wins / p.matches) * 100) : 0,
          avgScore: p.matches > 0 ? Math.round(p.totalScore / p.matches) : 0,
          avgAccuracy: p.accuracyCount > 0 ? Math.round(p.totalAccuracy / p.accuracyCount) : 0,
        };
      })
      .sort(function (a, b) { return b.winRate - a.winRate || b.wins - a.wins; })
      .slice(0, limit);

    leaderboard.forEach(function (p, i) { p.rank = i + 1; });

    res.json({ leaderboard: leaderboard });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
