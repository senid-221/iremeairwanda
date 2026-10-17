/**
 * Seed game questions into the database.
 * Run: node prisma/seed-game-questions.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SUBJECT_IDS = {
  MAT: '01c0711f-bb56-4a8d-8e5e-06b388792920',
  SCI: '99cbffc8-025b-4b0d-86f9-83f93038d53e',
  ENG: 'd92342e9-7949-4418-841c-8eb2e09df1db',
  KIN: '0d5d568f-dd79-4709-ba6b-c37fe7906c8d',
  SST: 'aee6a720-e42d-40c4-9a7e-070ef0c25a27',
  PHY: '72534723-a319-450c-b374-efced33248a8',
  CHE: '53cd21bc-e66b-4dd1-82a6-3fd47baabca8',
  BIO: 'c78ea192-799b-4e09-96c4-d4a9fb5f0ed6',
  FRE: '7cd19a31-3c67-466c-9ba1-5fc512396b8a',
  GEO: 'be0fec89-8aa7-4251-a2c3-c426eb8eb13c',
  COM: 'ca6c9b1f-aa8b-4dda-ab11-371c61971f51',
  HIS: '7254355e-94a6-41cf-85ec-816251249892',
};

const QUESTIONS = [
  // Mathematics
  { subjectCode: 'MAT', difficulty: 'easy', textEn: 'What is 25 + 37?', textRw: '25 + 37 ni iki?', explanationEn: '25 + 37 = 62. Add the ones: 5+7=12, carry 1. Add the tens: 2+3+1=6.', explanationRw: '25 + 37 = 62.', options: [{ text: '52', correct: false }, { text: '62', correct: true }, { text: '72', correct: false }, { text: '42', correct: false }] },
  { subjectCode: 'MAT', difficulty: 'easy', textEn: 'What is 148 + 267?', textRw: '148 + 267 ni iki?', explanationEn: '148 + 267 = 415.', explanationRw: '148 + 267 = 415.', options: [{ text: '415', correct: true }, { text: '315', correct: false }, { text: '405', correct: false }, { text: '425', correct: false }] },
  { subjectCode: 'MAT', difficulty: 'easy', textEn: 'What is 83 - 47?', textRw: '83 - 47 ni iki?', explanationEn: '83 - 47 = 36.', explanationRw: '83 - 47 = 36.', options: [{ text: '36', correct: true }, { text: '46', correct: false }, { text: '26', correct: false }, { text: '44', correct: false }] },
  { subjectCode: 'MAT', difficulty: 'medium', textEn: 'What is 12 x 8?', textRw: '12 x 8 ni iki?', explanationEn: '12 x 8 = 96.', explanationRw: '12 x 8 = 96.', options: [{ text: '86', correct: false }, { text: '96', correct: true }, { text: '106', correct: false }, { text: '88', correct: false }] },
  { subjectCode: 'MAT', difficulty: 'medium', textEn: 'What is 15 x 6?', textRw: '15 x 6 ni iki?', explanationEn: '15 x 6 = 90.', explanationRw: '15 x 6 = 90.', options: [{ text: '80', correct: false }, { text: '85', correct: false }, { text: '90', correct: true }, { text: '95', correct: false }] },
  { subjectCode: 'MAT', difficulty: 'medium', textEn: 'What is 144 / 12?', textRw: '144 / 12 ni iki?', explanationEn: '144 / 12 = 12.', explanationRw: '144 / 12 = 12.', options: [{ text: '10', correct: false }, { text: '11', correct: false }, { text: '12', correct: true }, { text: '14', correct: false }] },
  { subjectCode: 'MAT', difficulty: 'hard', textEn: 'What is 3/4 + 1/2?', textRw: '3/4 + 1/2 ni iki?', explanationEn: '3/4 + 1/2 = 3/4 + 2/4 = 5/4.', explanationRw: '3/4 + 1/2 = 5/4.', options: [{ text: '5/4', correct: true }, { text: '4/6', correct: false }, { text: '1', correct: false }, { text: '7/4', correct: false }] },
  { subjectCode: 'MAT', difficulty: 'hard', textEn: 'If 3x + 7 = 22, what is x?', textRw: 'Niba 3x + 7 = 22, x ni iki?', explanationEn: '3x + 7 = 22 → 3x = 15 → x = 5.', explanationRw: '3x + 7 = 22 → x = 5.', options: [{ text: '3', correct: false }, { text: '5', correct: true }, { text: '7', correct: false }, { text: '9', correct: false }] },
  { subjectCode: 'MAT', difficulty: 'medium', textEn: 'What is the area of a rectangle with length 8cm and width 5cm?', textRw: 'Ubuso bw\'urukiramende rufite 8cm na 5cm ni ubuhe?', explanationEn: 'Area = 8 x 5 = 40 cm².', explanationRw: 'Ubuso = 8 x 5 = 40 cm².', options: [{ text: '13 cm²', correct: false }, { text: '26 cm²', correct: false }, { text: '40 cm²', correct: true }, { text: '80 cm²', correct: false }] },
  { subjectCode: 'MAT', difficulty: 'hard', textEn: 'What is the volume of a cube with side 4cm?', textRw: 'Ingano y\'ikibe gifite uruhande 4cm ni iyihe?', explanationEn: 'Volume = 4³ = 64 cm³.', explanationRw: 'Ingano = 4³ = 64 cm³.', options: [{ text: '16 cm³', correct: false }, { text: '48 cm³', correct: false }, { text: '64 cm³', correct: true }, { text: '96 cm³', correct: false }] },

  // Science
  { subjectCode: 'SCI', difficulty: 'easy', textEn: 'What do plants need to make food?', textRw: 'Ibimera bikeneye iki gukora ibiryo?', explanationEn: 'Plants need sunlight, water, and CO2 for photosynthesis.', explanationRw: 'Ibimera bikeneye urumuri, amazi, na CO2.', options: [{ text: 'Sunlight, water, CO2', correct: true }, { text: 'Darkness, sand', correct: false }, { text: 'Only water', correct: false }, { text: 'Only soil', correct: false }] },
  { subjectCode: 'SCI', difficulty: 'easy', textEn: 'Which animal is a mammal?', textRw: 'Ni ikihe kiremwa ari inyamabere?', explanationEn: 'Dogs are mammals — they have fur, give birth to live young, and produce milk.', explanationRw: 'Imbwa ni inyamabere.', options: [{ text: 'Snake', correct: false }, { text: 'Fish', correct: false }, { text: 'Dog', correct: true }, { text: 'Frog', correct: false }] },
  { subjectCode: 'SCI', difficulty: 'medium', textEn: 'How many chambers does the human heart have?', textRw: 'Umutima w\'umuntu ufite ibyumba bingahe?', explanationEn: 'The human heart has 4 chambers: 2 atria and 2 ventricles.', explanationRw: 'Umutima ufite ibyumba 4.', options: [{ text: '2', correct: false }, { text: '3', correct: false }, { text: '4', correct: true }, { text: '5', correct: false }] },
  { subjectCode: 'SCI', difficulty: 'medium', textEn: 'What is the boiling point of water at sea level?', textRw: 'Amazi atangira kubira kuri ikihe gipimo?', explanationEn: 'Water boils at 100°C at standard atmospheric pressure.', explanationRw: 'Amazi abira kuri 100°C.', options: [{ text: '50°C', correct: false }, { text: '80°C', correct: false }, { text: '100°C', correct: true }, { text: '120°C', correct: false }] },
  { subjectCode: 'SCI', difficulty: 'hard', textEn: 'What type of energy does a moving car have?', textRw: 'Imodoka igenda ifite ubwoko bwingihe bw\'ingufu?', explanationEn: 'A moving car has kinetic energy because it is in motion.', explanationRw: 'Imodoka ifite ingufu z\'umuvuduko.', options: [{ text: 'Potential energy', correct: false }, { text: 'Kinetic energy', correct: true }, { text: 'Chemical energy', correct: false }, { text: 'Nuclear energy', correct: false }] },
  { subjectCode: 'SCI', difficulty: 'medium', textEn: 'What layer of Earth do we live on?', textRw: 'Ni iyihe layer y\'isi tubaho?', explanationEn: 'We live on the Earth\'s crust.', explanationRw: 'Tubaho ku gishishwa cy\'isi.', options: [{ text: 'Core', correct: false }, { text: 'Mantle', correct: false }, { text: 'Crust', correct: true }, { text: 'Atmosphere', correct: false }] },

  // English
  { subjectCode: 'ENG', difficulty: 'easy', textEn: 'Which word is a noun?', textRw: 'Ni irihe jambo ari izina?', explanationEn: '"Book" is a noun — it names a thing.', explanationRw: '"Igitabo" ni izina.', options: [{ text: 'Run', correct: false }, { text: 'Beautiful', correct: false }, { text: 'Book', correct: true }, { text: 'Quickly', correct: false }] },
  { subjectCode: 'ENG', difficulty: 'easy', textEn: 'What is the plural of "child"?', textRw: 'Ikinyuranyo cya "child" ni iki?', explanationEn: '"Children" is the irregular plural of "child".', explanationRw: '"Children" ni ubwinshi bwa "child".', options: [{ text: 'Childs', correct: false }, { text: 'Children', correct: true }, { text: 'Childes', correct: false }, { text: 'Childern', correct: false }] },
  { subjectCode: 'ENG', difficulty: 'medium', textEn: 'What does "enormous" mean?', textRw: '"Enormous" bivuga iki?', explanationEn: '"Enormous" means extremely large.', explanationRw: '"Enormous" bivuga kinini cyane.', options: [{ text: 'Tiny', correct: false }, { text: 'Very large', correct: true }, { text: 'Fast', correct: false }, { text: 'Colorful', correct: false }] },
  { subjectCode: 'ENG', difficulty: 'medium', textEn: 'What is a synonym for "brave"?', textRw: 'Ni irihe jambo risobanura "brave"?', explanationEn: '"Courageous" is a synonym for "brave".', explanationRw: '"Courageous" ni insobanuro ya "brave".', options: [{ text: 'Cowardly', correct: false }, { text: 'Courageous', correct: true }, { text: 'Lazy', correct: false }, { text: 'Angry', correct: false }] },
  { subjectCode: 'ENG', difficulty: 'hard', textEn: 'Which sentence uses correct punctuation?', textRw: 'Ni iyihe nteruro ikoresha utumenyetso tw\'andika neza?', explanationEn: '"It\'s" needs an apostrophe and the sentence needs a period.', explanationRw: '"It\'s" ikeneye agace n\'akadomo.', options: [{ text: 'Its a beautiful day', correct: false }, { text: "It's a beautiful day.", correct: true }, { text: 'Its a beautiful day.', correct: false }, { text: "It's a beautiful day", correct: false }] },

  // Social Studies
  { subjectCode: 'SST', difficulty: 'easy', textEn: 'What is the capital city of Rwanda?', textRw: 'Umujyi mukuru w\'u Rwanda ni uwuhe?', explanationEn: 'Kigali is the capital of Rwanda.', explanationRw: 'Kigali ni wo mujyi mukuru w\'u Rwanda.', options: [{ text: 'Butare', correct: false }, { text: 'Gisenyi', correct: false }, { text: 'Kigali', correct: true }, { text: 'Ruhengeri', correct: false }] },
  { subjectCode: 'SST', difficulty: 'easy', textEn: 'How many provinces does Rwanda have?', textRw: 'Intara z\'u Rwanda ni zingahe?', explanationEn: 'Rwanda has 5 provinces.', explanationRw: 'U Rwanda rufite intara 5.', options: [{ text: '3', correct: false }, { text: '4', correct: false }, { text: '5', correct: true }, { text: '6', correct: false }] },
  { subjectCode: 'SST', difficulty: 'medium', textEn: 'When did Rwanda gain independence?', textRw: 'U Rwanda rwabonye ubwigenge ryari?', explanationEn: 'Rwanda gained independence on July 1, 1962.', explanationRw: 'U Rwanda rwabonye ubwigenge ku ya 1 Nyakanga 1962.', options: [{ text: '1959', correct: false }, { text: '1962', correct: true }, { text: '1970', correct: false }, { text: '1994', correct: false }] },
  { subjectCode: 'SST', difficulty: 'medium', textEn: 'What are the official languages of Rwanda?', textRw: 'Indimi zemewe mu Rwanda ni izihe?', explanationEn: 'Rwanda has 4 official languages.', explanationRw: 'U Rwanda rufite indimi 4 zemewe.', options: [{ text: 'Kinyarwanda only', correct: false }, { text: 'Kinyarwanda and French', correct: false }, { text: 'Kinyarwanda, French, English', correct: false }, { text: 'Kinyarwanda, English, French, Swahili', correct: true }] },

  // Physics
  { subjectCode: 'PHY', difficulty: 'medium', textEn: 'What is the unit of force?', textRw: 'Igipimo cy\'imbaraga ni ikihe?', explanationEn: 'The unit of force is Newton (N).', explanationRw: 'Igipimo cy\'imbaraga ni Newton (N).', options: [{ text: 'Joule', correct: false }, { text: 'Newton', correct: true }, { text: 'Watt', correct: false }, { text: 'Pascal', correct: false }] },
  { subjectCode: 'PHY', difficulty: 'medium', textEn: 'What is the acceleration due to gravity on Earth?', textRw: 'Umuvuduko w\'imbaraga z\'isi ni uwuhe?', explanationEn: 'Gravity on Earth ≈ 9.8 m/s².', explanationRw: 'Imbaraga z\'isi ≈ 9.8 m/s².', options: [{ text: '9.8 m/s²', correct: true }, { text: '10.8 m/s²', correct: false }, { text: '8.9 m/s²', correct: false }, { text: '11 m/s²', correct: false }] },
  { subjectCode: 'PHY', difficulty: 'hard', textEn: 'What is Ohm\'s Law?', textRw: 'Itegeko rya Ohm ni irihe?', explanationEn: 'Ohm\'s Law: V = IR.', explanationRw: 'Itegeko rya Ohm: V = IR.', options: [{ text: 'V = IR', correct: true }, { text: 'V = I/R', correct: false }, { text: 'V = I+R', correct: false }, { text: 'V = I-R', correct: false }] },

  // Chemistry
  { subjectCode: 'CHE', difficulty: 'medium', textEn: 'What is the atomic number of Carbon?', textRw: 'Nomero ya atome ya Karubone ni iyihe?', explanationEn: 'Carbon has atomic number 6.', explanationRw: 'Karubone ifite nomero ya atome 6.', options: [{ text: '4', correct: false }, { text: '6', correct: true }, { text: '8', correct: false }, { text: '12', correct: false }] },
  { subjectCode: 'CHE', difficulty: 'medium', textEn: 'What is the chemical symbol for Gold?', textRw: 'Ikimenyetso cy\'ubutabire cya Zahabu ni ikihe?', explanationEn: 'Gold\'s symbol is Au (from Latin "aurum").', explanationRw: 'Ikimenyetso cya Zahabu ni Au.', options: [{ text: 'Go', correct: false }, { text: 'Gd', correct: false }, { text: 'Au', correct: true }, { text: 'Ag', correct: false }] },
  { subjectCode: 'CHE', difficulty: 'hard', textEn: 'What type of reaction is: 2H₂ + O₂ → 2H₂O?', textRw: 'Ni ubwoko bwingihe bw\'igikorwa: 2H₂ + O₂ → 2H₂O?', explanationEn: 'This is a synthesis reaction.', explanationRw: 'Iki ni igikorwa cyo guhuza.', options: [{ text: 'Decomposition', correct: false }, { text: 'Synthesis', correct: true }, { text: 'Single replacement', correct: false }, { text: 'Double replacement', correct: false }] },

  // Biology
  { subjectCode: 'BIO', difficulty: 'medium', textEn: 'What is the powerhouse of the cell?', textRw: 'Ni ikihe gice cy\'ingufu z\'akaremangingo?', explanationEn: 'Mitochondria produce ATP.', explanationRw: 'Mitochondria ikora ATP.', options: [{ text: 'Nucleus', correct: false }, { text: 'Ribosome', correct: false }, { text: 'Mitochondria', correct: true }, { text: 'Golgi body', correct: false }] },
  { subjectCode: 'BIO', difficulty: 'hard', textEn: 'What molecule carries genetic information?', textRw: 'Ni iyihe molecule itwara amakuru y\'uruhererekane?', explanationEn: 'DNA carries genetic instructions.', explanationRw: 'DNA itwara amabwiriza y\'uruhererekane.', options: [{ text: 'RNA', correct: false }, { text: 'DNA', correct: true }, { text: 'Protein', correct: false }, { text: 'Lipid', correct: false }] },

  // French
  { subjectCode: 'FRE', difficulty: 'easy', textEn: 'What is "book" in French?', textRw: '"Igitabo" mu Gifaransa ni iki?', explanationEn: '"Book" in French is "le livre".', explanationRw: '"Igitabo" mu Gifaransa ni "le livre".', options: [{ text: 'Le livre', correct: true }, { text: 'La maison', correct: false }, { text: 'Le crayon', correct: false }, { text: "L'école", correct: false }] },
  { subjectCode: 'FRE', difficulty: 'medium', textEn: 'What is the correct form? "Je ___ étudiant."', textRw: 'Ni iyihe form ikwiye? "Je ___ étudiant."', explanationEn: '"Je suis" is first person singular of "être".', explanationRw: '"Je suis" ni umuntu wa mbere wa "être".', options: [{ text: 'suis', correct: true }, { text: 'es', correct: false }, { text: 'est', correct: false }, { text: 'sommes', correct: false }] },

  // Computer Science
  { subjectCode: 'COM', difficulty: 'easy', textEn: 'What does HTML stand for?', textRw: 'HTML isobanura iki?', explanationEn: 'HTML = HyperText Markup Language.', explanationRw: 'HTML = HyperText Markup Language.', options: [{ text: 'Hyper Text Markup Language', correct: true }, { text: 'High Tech Modern Language', correct: false }, { text: 'Hyper Transfer Markup Language', correct: false }, { text: 'Home Tool Markup Language', correct: false }] },
  { subjectCode: 'COM', difficulty: 'hard', textEn: 'What data structure uses FIFO?', textRw: 'Ni iyihe structure y\'amakuru ikoresha FIFO?', explanationEn: 'A Queue uses FIFO.', explanationRw: 'Queue ikoresha FIFO.', options: [{ text: 'Stack', correct: false }, { text: 'Queue', correct: true }, { text: 'Tree', correct: false }, { text: 'Graph', correct: false }] },

  // Geography
  { subjectCode: 'GEO', difficulty: 'medium', textEn: 'What is the longest river in Africa?', textRw: 'Ni uruhe ruzi rurerure muri Afurika?', explanationEn: 'The Nile is the longest river in Africa.', explanationRw: 'Nili ni rwo ruzi rurerure muri Afurika.', options: [{ text: 'Congo', correct: false }, { text: 'Nile', correct: true }, { text: 'Niger', correct: false }, { text: 'Zambezi', correct: false }] },
  { subjectCode: 'GEO', difficulty: 'medium', textEn: 'What causes the seasons on Earth?', textRw: 'Ni iki gitera ibihe by\'umwaka ku isi?', explanationEn: 'Seasons are caused by the 23.5° tilt of Earth\'s axis.', explanationRw: 'Ibihe biterwa n\'ukwihina kw\'isi ku 23.5°.', options: [{ text: 'Distance from Sun', correct: false }, { text: "Tilt of Earth's axis", correct: true }, { text: "Moon's gravity", correct: false }, { text: 'Solar flares', correct: false }] },

  // Kinyarwanda
  { subjectCode: 'KIN', difficulty: 'easy', textEn: 'Fill in: "Umwana ___ amazi."', textRw: 'Ishyiramo ijambo ribereye: "Umwana ___ amazi."', explanationEn: '"Anywa" means drinks.', explanationRw: '"Anywa" bivuga kunywa.', options: [{ text: 'Anywa', correct: true }, { text: 'Arya', correct: false }, { text: 'Asoma', correct: false }, { text: 'Akorana', correct: false }] },
  { subjectCode: 'KIN', difficulty: 'easy', textEn: 'Which is a noun (izina)?', textRw: 'Ni izina irihe muri izi?', explanationEn: '"Igitabo" is a noun.', explanationRw: '"Igitabo" ni izina.', options: [{ text: 'Gukora', correct: false }, { text: 'Kwiza', correct: false }, { text: 'Igitabo', correct: true }, { text: 'Vuba', correct: false }] },

  // History
  { subjectCode: 'HIS', difficulty: 'medium', textEn: 'What kingdom existed in Rwanda before colonization?', textRw: 'Ni ubuhe bwami bwari mu Rwanda mbere y\'abakoroni?', explanationEn: 'The Kingdom of Rwanda was a pre-colonial state.', explanationRw: 'Ubwami bw\'u Rwanda bwari igihugu cy\'mbere y\'abakoroni.', options: [{ text: 'Buganda', correct: false }, { text: 'Kingdom of Rwanda', correct: true }, { text: 'Bugesera', correct: false }, { text: 'Burundi', correct: false }] },
];

async function main() {
  console.log('Seeding game questions...');

  // Group questions by subject
  const bySubject = {};
  QUESTIONS.forEach(q => {
    if (!bySubject[q.subjectCode]) bySubject[q.subjectCode] = [];
    bySubject[q.subjectCode].push(q);
  });

  let totalCreated = 0;

  for (const [subjectCode, questions] of Object.entries(bySubject)) {
    const subjectId = SUBJECT_IDS[subjectCode];
    if (!subjectId) {
      console.log('Skipping unknown subject:', subjectCode);
      continue;
    }

    // Create a question bank for this subject
    const bank = await prisma.questionBank.create({
      data: {
        name: subjectCode + ' Game Questions',
        description: 'Game questions for ' + subjectCode,
        subjectId: subjectId,
        isPublic: true,
      },
    });

    console.log('Created bank for', subjectCode, ':', bank.id);

    // Create questions
    for (const q of questions) {
      const question = await prisma.question.create({
        data: {
          questionBankId: bank.id,
          questionType: 'multiple_choice',
          questionText: q.textEn,
          questionTextEn: q.textEn,
          questionTextRw: q.textRw,
          difficulty: q.difficulty,
          points: q.difficulty === 'hard' ? 3 : q.difficulty === 'medium' ? 2 : 1,
          timeLimitSeconds: 30,
          explanation: q.explanationEn,
          explanationEn: q.explanationEn,
          explanationRw: q.explanationRw,
          isActive: true,
        },
      });

      // Create options
      for (let i = 0; i < q.options.length; i++) {
        await prisma.questionOption.create({
          data: {
            questionId: question.id,
            optionText: q.options[i].text,
            optionTextEn: q.options[i].text,
            optionTextRw: q.options[i].text,
            optionOrder: i,
            isCorrect: q.options[i].correct,
          },
        });
      }

      totalCreated++;
    }
  }

  console.log('Seeded', totalCreated, 'questions across', Object.keys(bySubject).length, 'subjects');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
