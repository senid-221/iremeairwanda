var IremeGame = {
    STORAGE_KEY: 'ireme-game-state',
    HISTORY_KEY: 'ireme-match-history',

    state: {
        phase: 'idle',
        mode: null,
        pathway: null,
        level: null,
        subject: null,
        subjectName: '',
        topic: 'all',
        difficulty: 'adaptive',
        language: 'en',
        duration: 10,
        opponent: null,
        currentRound: 0,
        totalRounds: 5,
        playerScore: 0,
        opponentScore: 0,
        playerTurn: true,
        timer: 30,
        currentQuestion: null,
        questions: [],
        answers: [],
        matchId: null,
        startedAt: null,
        matchHistory: [],
    },

    gameModes: [
        { id: 'quick', icon: 'fa-bolt', name: 'Quick Match', nameRw: 'Umukino Wihuse', desc: 'Find an opponent at your level instantly', descRw: 'Shaka umukinnyi ku rwego rwawe vuba' },
        { id: 'battle', icon: 'fa-fist-raised', name: '1v1 Battle', nameRw: 'Urugamba 1v1', desc: 'Challenge a specific learner to a duel', descRw: 'Hamagara umunyeshuri kurwana' },
        { id: 'practice', icon: 'fa-robot', name: 'AI Practice', nameRw: 'Kwitoza na AI', desc: 'Train against adaptive IREME AI', descRw: 'Kwitoza na IREME AI ihinduka' },
        { id: 'revision', icon: 'fa-book-open', name: 'Revision Battle', nameRw: 'Umukino wo Gusubiramo', desc: 'Timed revision for exam preparation', descRw: 'Gusubiramo mu gihe cy\'ibizamini' },
    ],

    difficulties: [
        { id: 'easy', label: 'Easy', labelRw: 'Byoroshye', color: '#12b981' },
        { id: 'medium', label: 'Medium', labelRw: 'Biringaniye', color: '#f4a926' },
        { id: 'hard', label: 'Hard', labelRw: 'Bigoye', color: '#e35656' },
        { id: 'adaptive', label: 'Adaptive', labelRw: 'Bihinduka', color: '#1363C6' },
    ],

    questionBank: {
        mathematics: [
            { id: 'mat001', topic: 'Addition', difficulty: 'easy', text_en: 'What is 25 + 37?', text_rw: '25 + 37 ni iki?', options_en: ['52', '62', '72', '42'], options_rw: ['52', '62', '72', '42'], correct: 1, explanation_en: '25 + 37 = 62. Add the ones: 5+7=12, carry 1. Add the tens: 2+3+1=6.', explanation_rw: '25 + 37 = 62. Tera ibice: 5+7=12, twikubite 1. Tera ibice by\'ikumi: 2+3+1=6.', subjectCode: 'MAT', level: 'P4' },
            { id: 'mat002', topic: 'Addition', difficulty: 'easy', text_en: 'What is 148 + 267?', text_rw: '148 + 267 ni iki?', options_en: ['415', '315', '405', '425'], options_rw: ['415', '315', '405', '425'], correct: 0, explanation_en: '148 + 267 = 415. Add column by column from right to left.', explanation_rw: '148 + 267 = 415. Tera inkingi ku yindi iburyo ibumoso.', subjectCode: 'MAT', level: 'P4' },
            { id: 'mat003', topic: 'Subtraction', difficulty: 'easy', text_en: 'What is 83 - 47?', text_rw: '83 - 47 ni iki?', options_en: ['36', '46', '26', '44'], options_rw: ['36', '46', '26', '44'], correct: 0, explanation_en: '83 - 47 = 36. Borrow from the tens when needed.', explanation_rw: '83 - 47 = 36. Saba ku bice by\'ikumi iyo bikenewe.', subjectCode: 'MAT', level: 'P4' },
            { id: 'mat004', topic: 'Multiplication', difficulty: 'medium', text_en: 'What is 12 x 8?', text_rw: '12 x 8 ni iki?', options_en: ['86', '96', '106', '88'], options_rw: ['86', '96', '106', '88'], correct: 1, explanation_en: '12 x 8 = 96. Break it down: 10x8=80, 2x8=16, 80+16=96.', explanation_rw: '12 x 8 = 96. Gabanya: 10x8=80, 2x8=16, 80+16=96.', subjectCode: 'MAT', level: 'P5' },
            { id: 'mat005', topic: 'Multiplication', difficulty: 'medium', text_en: 'What is 15 x 6?', text_rw: '15 x 6 ni iki?', options_en: ['80', '85', '90', '95'], options_rw: ['80', '85', '90', '95'], correct: 2, explanation_en: '15 x 6 = 90. Think of it as 10x6=60 plus 5x6=30, total 90.', explanation_rw: '15 x 6 = 90. Tekereza 10x6=60 wongere 5x6=30, yose hamwe 90.', subjectCode: 'MAT', level: 'P5' },
            { id: 'mat006', topic: 'Division', difficulty: 'medium', text_en: 'What is 144 / 12?', text_rw: '144 / 12 ni iki?', options_en: ['10', '11', '12', '14'], options_rw: ['10', '11', '12', '14'], correct: 2, explanation_en: '144 / 12 = 12. Because 12 x 12 = 144.', explanation_rw: '144 / 12 = 12. Kubera 12 x 12 = 144.', subjectCode: 'MAT', level: 'P5' },
            { id: 'mat007', topic: 'Fractions', difficulty: 'hard', text_en: 'What is 3/4 + 1/2?', text_rw: '3/4 + 1/2 ni iki?', options_en: ['5/4', '4/6', '1', '7/4'], options_rw: ['5/4', '4/6', '1', '7/4'], correct: 0, explanation_en: '3/4 + 1/2 = 3/4 + 2/4 = 5/4. Find a common denominator first.', explanation_rw: '3/4 + 1/2 = 3/4 + 2/4 = 5/4. Shaka umubare w\'ibanze umwe.', subjectCode: 'MAT', level: 'P6' },
            { id: 'mat008', topic: 'Fractions', difficulty: 'hard', text_en: 'What is 2/3 x 3/5?', text_rw: '2/3 x 3/5 ni iki?', options_en: ['6/15', '2/5', '5/8', '6/8'], options_rw: ['6/15', '2/5', '5/8', '6/8'], correct: 1, explanation_en: '2/3 x 3/5 = 6/15 = 2/5. Multiply numerators and denominators, then simplify.', explanation_rw: '2/3 x 3/5 = 6/15 = 2/5. Kuba hejuru n\'epfo, hanyuma woroshye.', subjectCode: 'MAT', level: 'P6' },
            { id: 'mat009', topic: 'Algebra', difficulty: 'hard', text_en: 'If 3x + 7 = 22, what is x?', text_rw: 'Niba 3x + 7 = 22, x ni iki?', options_en: ['3', '5', '7', '9'], options_rw: ['3', '5', '7', '9'], correct: 1, explanation_en: '3x + 7 = 22. Subtract 7: 3x = 15. Divide by 3: x = 5.', explanation_rw: '3x + 7 = 22. Kuramo 7: 3x = 15. Gabanya na 3: x = 5.', subjectCode: 'MAT', level: 'S1' },
            { id: 'mat010', topic: 'Algebra', difficulty: 'hard', text_en: 'Solve: 2(x - 3) = 10', text_rw: 'Gukuramo: 2(x - 3) = 10', options_en: ['5', '8', '6', '7'], options_rw: ['5', '8', '6', '7'], correct: 1, explanation_en: '2(x - 3) = 10. Divide by 2: x - 3 = 5. Add 3: x = 8.', explanation_rw: '2(x - 3) = 10. Gabanya na 2: x - 3 = 5. Ongeraho 3: x = 8.', subjectCode: 'MAT', level: 'S2' },
            { id: 'mat011', topic: 'Geometry', difficulty: 'medium', text_en: 'What is the area of a rectangle with length 8cm and width 5cm?', text_rw: 'Ubuso bw\'urukiramende rufite uburebure 8cm n\'ubugari 5cm ni ubuhe?', options_en: ['13 cm²', '26 cm²', '40 cm²', '80 cm²'], options_rw: ['13 cm²', '26 cm²', '40 cm²', '80 cm²'], correct: 2, explanation_en: 'Area = length x width = 8 x 5 = 40 cm².', explanation_rw: 'Ubuso = uburebure x ubugari = 8 x 5 = 40 cm².', subjectCode: 'MAT', level: 'P5' },
            { id: 'mat012', topic: 'Geometry', difficulty: 'hard', text_en: 'What is the volume of a cube with side 4cm?', text_rw: 'Ingano y\'ikibe gifite uruhande 4cm ni iyihe?', options_en: ['16 cm³', '48 cm³', '64 cm³', '96 cm³'], options_rw: ['16 cm³', '48 cm³', '64 cm³', '96 cm³'], correct: 2, explanation_en: 'Volume = side³ = 4³ = 4 x 4 x 4 = 64 cm³.', explanation_rw: 'Ingano = uruhande³ = 4³ = 4 x 4 x 4 = 64 cm³.', subjectCode: 'MAT', level: 'S1' },
        ],
        science: [
            { id: 'sci001', topic: 'Living Things', difficulty: 'easy', text_en: 'What do plants need to make food?', text_rw: 'Ibimera bikeneye iki gukora ibiryo?', options_en: ['Sunlight, water, CO2', 'Darkness, sand', 'Only water', 'Only soil'], options_rw: ['Urumuri, amazi, CO2', 'Umwijima, umucanga', 'Amazi gusa', 'Ubutaka gusa'], correct: 0, explanation_en: 'Plants need sunlight, water, and carbon dioxide for photosynthesis.', explanation_rw: 'Ibimera bikeneye urumuri, amazi, na karuboni diyokisayidi muri fotosinteze.', subjectCode: 'SCI', level: 'P4' },
            { id: 'sci002', topic: 'Living Things', difficulty: 'easy', text_en: 'Which animal is a mammal?', text_rw: 'Ni ikihe kiremwa ari inyamabere?', options_en: ['Snake', 'Fish', 'Dog', 'Frog'], options_rw: ['Inzoka', 'Amafi', 'Imbwa', 'Igikeri'], correct: 2, explanation_en: 'Dogs are mammals — they have fur, give birth to live young, and produce milk.', explanation_rw: 'Imbwa ni inyamabere — zifite ubwoya, zibyara, zikagira amashereka.', subjectCode: 'SCI', level: 'P4' },
            { id: 'sci003', topic: 'Human Body', difficulty: 'medium', text_en: 'How many chambers does the human heart have?', text_rw: 'Umutima w\'umuntu ufite ibyumba bingahe?', options_en: ['2', '3', '4', '5'], options_rw: ['2', '3', '4', '5'], correct: 2, explanation_en: 'The human heart has 4 chambers: 2 atria and 2 ventricles.', explanation_rw: 'Umutima w\'umuntu ufite ibyumba 4: atria 2 na ventricles 2.', subjectCode: 'SCI', level: 'P5' },
            { id: 'sci004', topic: 'Matter', difficulty: 'medium', text_en: 'What is the boiling point of water at sea level?', text_rw: 'Amazi atangira kubira kuri ikihe gipimo?', options_en: ['50°C', '80°C', '100°C', '120°C'], options_rw: ['50°C', '80°C', '100°C', '120°C'], correct: 2, explanation_en: 'Water boils at 100°C (212°F) at standard atmospheric pressure.', explanation_rw: 'Amazi abira kuri 100°C ku gitutu gisanzwe cy\'umwuka.', subjectCode: 'SCI', level: 'P6' },
            { id: 'sci005', topic: 'Energy', difficulty: 'hard', text_en: 'What type of energy does a moving car have?', text_rw: 'Imodoka igenda ifite ubwoko bwingihe bw\'ingufu?', options_en: ['Potential energy', 'Kinetic energy', 'Chemical energy', 'Nuclear energy'], options_rw: ['Ingufu z\'ububiko', 'Ingufu z\'umuvuduko', 'Ingufu z\'imiti', 'Ingufu za nikleyeri'], correct: 1, explanation_en: 'A moving car has kinetic energy because it is in motion.', explanation_rw: 'Imodoka igenda ifite ingufu z\'umuvuduko kubera iri mu rugendo.', subjectCode: 'SCI', level: 'S1' },
            { id: 'sci006', topic: 'Earth Science', difficulty: 'medium', text_en: 'What layer of Earth do we live on?', text_rw: 'Ni iyihe layer y\'isi tubaho?', options_en: ['Core', 'Mantle', 'Crust', 'Atmosphere'], options_rw: ['Umutima', 'Mantle', 'Igishishwa', 'Ikirere'], correct: 2, explanation_en: 'We live on the Earth\'s crust — the thin outer layer of solid rock.', explanation_rw: 'Tubaho ku gishishwa cy\'isi — igice cy\'uruhabwa ruto rw\'ibitare.', subjectCode: 'SCI', level: 'P5' },
        ],
        english: [
            { id: 'eng001', topic: 'Grammar', difficulty: 'easy', text_en: 'Which word is a noun?', text_rw: 'Ni irihe jambo ari izina?', options_en: ['Run', 'Beautiful', 'Book', 'Quickly'], options_rw: ['Gukora', 'Kwiza', 'Igitabo', 'Vuba'], correct: 2, explanation_en: '"Book" is a noun — it names a thing. "Run" is a verb, "Beautiful" is an adjective.', explanation_rw: '"Igitabo" ni izina — rivuga ikintu. "Gukora" ni umugozo, "Kwiza" ni umuvugo.', subjectCode: 'ENG', level: 'P4' },
            { id: 'eng002', topic: 'Grammar', difficulty: 'easy', text_en: 'What is the plural of "child"?', text_rw: 'Ikinyuranyo cya "child" ni iki?', options_en: ['Childs', 'Children', 'Childes', 'Childern'], options_rw: ['Childs', 'Children', 'Childes', 'Childern'], correct: 1, explanation_en: '"Children" is the irregular plural form of "child".', explanation_rw: '"Children" ni ubwinshi budasanzwe bwa "child".', subjectCode: 'ENG', level: 'P4' },
            { id: 'eng003', topic: 'Vocabulary', difficulty: 'medium', text_en: 'What does "enormous" mean?', text_rw: '"Enormous" bivuga iki?', options_en: ['Tiny', 'Very large', 'Fast', 'Colorful'], options_rw: ['Gito cyane', 'Kinini cyane', 'Byihuta', 'Bifite amabara'], correct: 1, explanation_en: '"Enormous" means extremely large or huge.', explanation_rw: '"Enormous" bivuga kinini cyane.', subjectCode: 'ENG', level: 'P5' },
            { id: 'eng004', topic: 'Comprehension', difficulty: 'medium', text_en: 'What is a synonym for "brave"?', text_rw: 'Ni irihe jambo risobanura "brave"?', options_en: ['Cowardly', 'Courageous', 'Lazy', 'Angry'], options_rw: ['Igikora', 'Intwari', 'Umunebwe', 'Urakariye'], correct: 1, explanation_en: '"Courageous" is a synonym for "brave" — both mean showing courage.', explanation_rw: '"Courageous" ni insobanuro imwe na "brave" — byombi bivuga kwerekana ubutwari.', subjectCode: 'ENG', level: 'P5' },
            { id: 'eng005', topic: 'Writing', difficulty: 'hard', text_en: 'Which sentence uses the correct punctuation?', text_rw: 'Ni iyihe nteruro ikoresha utumenyetso tw\'andika neza?', options_en: ['Its a beautiful day', 'It\'s a beautiful day.', 'Its a beautiful day.', 'It\'s a beautiful day'], options_rw: ['Its a beautiful day', 'It\'s a beautiful day.', 'Its a beautiful day.', 'It\'s a beautiful day'], correct: 1, explanation_en: '"It\'s" needs an apostrophe (contraction of "it is"), and the sentence needs a period.', explanation_rw: '"It\'s" ikeneye agace (inkubi ya "it is"), kandi interuro ikeneye akadomo.', subjectCode: 'ENG', level: 'P6' },
            { id: 'eng006', topic: 'Literature', difficulty: 'hard', text_en: 'What is the main theme of a story?', text_rw: 'Insanganyamatsiko nyamukuru y\'inkuru ni iki?', options_en: ['The title', 'The central idea or message', 'The number of characters', 'The setting'], options_rw: ['Umutwe', 'Igitekerezo cyangwa ubutumwa nyamukuru', 'Umubare w\'abantu', 'Aho inkuru ibera'], correct: 1, explanation_en: 'The theme is the central idea, message, or moral that the author conveys through the story.', explanation_rw: 'Insanganyamatsiko ni igitekerezo nyamukuru, ubutumwa, cyangwa inyigisho umwanditsi atanga mu nkuru.', subjectCode: 'ENG', level: 'S1' },
        ],
        kinyarwanda: [
            { id: 'kin001', topic: 'Ivugajambo', difficulty: 'easy', text_en: 'Ishyiramo ijambo ribereye: "Umwana ___ amazi."', text_rw: 'Ishyiramo ijambo ribereye: "Umwana ___ amazi."', options_en: ['Anywa', 'Arya', 'Asoma', 'Akorana'], options_rw: ['Anywa', 'Arya', 'Asoma', 'Akorana'], correct: 0, explanation_en: '"Anywa" means drinks. "Umwana anywa amazi" = The child drinks water.', explanation_rw: '"Anywa" bivuga kunywa. "Umwana anywa amazi" = umwana aranywa.', subjectCode: 'KIN', level: 'P4' },
            { id: 'kin002', topic: 'Ivugajambo', difficulty: 'easy', text_en: 'Ni izina irihe muri izi?', text_rw: 'Ni izina irihe muri izi?', options_en: ['Gukora', 'Kwiza', 'Igitabo', 'Vuba'], options_rw: ['Gukora', 'Kwiza', 'Igitabo', 'Vuba'], correct: 2, explanation_en: '"Igitabo" is a noun (izina). The others are verb, adjective, adverb.', explanation_rw: '"Igitabo" ni izina. Ibindi ni umugozo, umuvugo, agace.', subjectCode: 'KIN', level: 'P4' },
            { id: 'kin003', topic: 'Imvugo', difficulty: 'medium', text_en: '"U Rwanda ni rwigare" ni iki?', text_rw: '"U Rwanda ni rwigare" ni iki?', options_en: ['Umugani', 'Proverb', 'Indirimbo', 'Igisakuzo'], options_rw: ['Umugani', 'Umugani mugari', 'Indirimbo', 'Igisakuzo'], correct: 1, explanation_en: 'This is a Kinyarwanda proverb about Rwanda\'s uniqueness.', explanation_rw: 'Uyu ni umugani w\'Ikinyarwanda uvuga ubwiza bw\'u Rwanda.', subjectCode: 'KIN', level: 'P5' },
            { id: 'kin004', topic: 'Imyandikire', difficulty: 'medium', text_en: 'Andika neza: "Ngiye ku ___"', text_rw: 'Andika neza: "Ngiye ku ___"', options_en: ['ishuri', 'ishuri.', 'Ishuri', 'ishuri!'], options_rw: ['ishuri', 'ishuri.', 'Ishuri', 'ishuri!'], correct: 0, explanation_en: 'After "ku" the noun is written in lowercase unless it starts a sentence.', explanation_rw: 'Nyuma ya "ku" izina ryandikwa mu nyuguti nto keretse ritangiye interuro.', subjectCode: 'KIN', level: 'P6' },
        ],
        socialStudies: [
            { id: 'sst001', topic: 'Rwanda Geography', difficulty: 'easy', text_en: 'What is the capital city of Rwanda?', text_rw: 'Umujyi mukuru w\'u Rwanda ni uwuhe?', options_en: ['Butare', 'Gisenyi', 'Kigali', 'Ruhengeri'], options_rw: ['Butare', 'Gisenyi', 'Kigali', 'Ruhengeri'], correct: 2, explanation_en: 'Kigali is the capital city of Rwanda, located in the center of the country.', explanation_rw: 'Kigali ni wo mujyi mukuru w\'u Rwanda, uherereye hagati mu gihugu.', subjectCode: 'SST', level: 'P4' },
            { id: 'sst002', topic: 'Rwanda Geography', difficulty: 'easy', text_en: 'How many provinces does Rwanda have?', text_rw: 'Intara z\'u Rwanda ni zingahe?', options_en: ['3', '4', '5', '6'], options_rw: ['3', '4', '5', '6'], correct: 2, explanation_en: 'Rwanda has 5 provinces: Kigali City, Eastern, Western, Northern, and Southern.', explanation_rw: 'U Rwanda rufite intara 5: Umujyi wa Kigali, Iburasirazuba, Iburengerazuba, Amajyaruguru, n\'Amajyepfo.', subjectCode: 'SST', level: 'P5' },
            { id: 'sst003', topic: 'History', difficulty: 'medium', text_en: 'When did Rwanda gain independence?', text_rw: 'U Rwanda rwabonye ubwigenge ryari?', options_en: ['1959', '1962', '1970', '1994'], options_rw: ['1959', '1962', '1970', '1994'], correct: 1, explanation_en: 'Rwanda gained independence from Belgium on July 1, 1962.', explanation_rw: 'U Rwanda rwabonye ubwigenge ku Bubiligi ku ya 1 Nyakanga 1962.', subjectCode: 'SST', level: 'P6' },
            { id: 'sst004', topic: 'Civics', difficulty: 'medium', text_en: 'What are the official languages of Rwanda?', text_rw: 'Indimi zemewe mu Rwanda ni izihe?', options_en: ['Kinyarwanda only', 'Kinyarwanda and French', 'Kinyarwanda, French, English', 'Kinyarwanda, English, French, Swahili'], options_rw: ['Ikinyarwanda gusa', 'Ikinyarwanda n\'Igifaransa', 'Ikinyarwanda, Igifaransa, Icyongereza', 'Ikinyarwanda, Icyongereza, Igifaransa, Igiswahili'], correct: 3, explanation_en: 'Rwanda has 4 official languages: Kinyarwanda, French, English, and Swahili.', explanation_rw: 'U Rwanda rufite indimi 4 zemewe: Ikinyarwanda, Igifaransa, Icyongereza, n\'Igiswahili.', subjectCode: 'SST', level: 'S1' },
        ],
        physics: [
            { id: 'phy001', topic: 'Mechanics', difficulty: 'medium', text_en: 'What is the unit of force?', text_rw: 'Igipimo cy\'imbaraga ni ikihe?', options_en: ['Joule', 'Newton', 'Watt', 'Pascal'], options_rw: ['Joule', 'Newton', 'Watt', 'Pascal'], correct: 1, explanation_en: 'The unit of force is Newton (N), named after Isaac Newton.', explanation_rw: 'Igipimo cy\'imbaraga ni Newton (N), cyitiriwe Isaac Newton.', subjectCode: 'PHY', level: 'S4' },
            { id: 'phy002', topic: 'Mechanics', difficulty: 'medium', text_en: 'What is the acceleration due to gravity on Earth?', text_rw: 'Umuvuduko w\'imbaraga z\'isi ni uwuhe?', options_en: ['9.8 m/s²', '10.8 m/s²', '8.9 m/s²', '11 m/s²'], options_rw: ['9.8 m/s²', '10.8 m/s²', '8.9 m/s²', '11 m/s²'], correct: 0, explanation_en: 'The acceleration due to gravity on Earth is approximately 9.8 m/s².', explanation_rw: 'Umuvuduko w\'imbaraga z\'isi ni hafi 9.8 m/s².', subjectCode: 'PHY', level: 'S4' },
            { id: 'phy003', topic: 'Electricity', difficulty: 'hard', text_en: 'What is Ohm\'s Law?', text_rw: 'Itegeko rya Ohm ni irihe?', options_en: ['V = IR', 'V = I/R', 'V = I+R', 'V = I-R'], options_rw: ['V = IR', 'V = I/R', 'V = I+R', 'V = I-R'], correct: 0, explanation_en: 'Ohm\'s Law states V = IR, where V is voltage, I is current, R is resistance.', explanation_rw: 'Itegeko rya Ohm rivuga V = IR, aho V ni volutage, I ni umuriro, R ni uburemere.', subjectCode: 'PHY', level: 'S5' },
        ],
        chemistry: [
            { id: 'che001', topic: 'Atomic Structure', difficulty: 'medium', text_en: 'What is the atomic number of Carbon?', text_rw: 'Nomero ya atome ya Karubone ni iyihe?', options_en: ['4', '6', '8', '12'], options_rw: ['4', '6', '8', '12'], correct: 1, explanation_en: 'Carbon has atomic number 6, meaning it has 6 protons.', explanation_rw: 'Karubone ifite nomero ya atome 6, bivuga ko ifite protoni 6.', subjectCode: 'CHE', level: 'S4' },
            { id: 'che002', topic: 'Periodic Table', difficulty: 'medium', text_en: 'What is the chemical symbol for Gold?', text_rw: 'Ikimenyetso cy\'ubutabire cya Zahabu ni ikihe?', options_en: ['Go', 'Gd', 'Au', 'Ag'], options_rw: ['Go', 'Gd', 'Au', 'Ag'], correct: 2, explanation_en: 'Gold\'s chemical symbol is Au, from the Latin word "aurum".', explanation_rw: 'Ikimenyetso cya Zahabu ni Au, giturutse mu Kilatini "aurum".', subjectCode: 'CHE', level: 'S4' },
            { id: 'che003', topic: 'Chemical Reactions', difficulty: 'hard', text_en: 'What type of reaction is: 2H₂ + O₂ → 2H₂O?', text_rw: 'Ni ubwoko bwingihe bw\'igikorwa: 2H₂ + O₂ → 2H₂O?', options_en: ['Decomposition', 'Synthesis', 'Single replacement', 'Double replacement'], options_rw: ['Gusenyuka', 'Guhuza', 'Gusimbuza kimwe', 'Gusimbuza bibiri'], correct: 1, explanation_en: 'This is a synthesis reaction — two elements combine to form a compound.', explanation_rw: 'Iki ni igikorwa cyo guhuza — ibintu bibiri bihurira hamwe bikora ikintu gishya.', subjectCode: 'CHE', level: 'S5' },
        ],
        biology: [
            { id: 'bio001', topic: 'Cell Biology', difficulty: 'medium', text_en: 'What is the powerhouse of the cell?', text_rw: 'Ni ikihe gice cy\'ingufu z\'akaremangingo?', options_en: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi body'], options_rw: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi body'], correct: 2, explanation_en: 'Mitochondria produce ATP, the energy currency of the cell.', explanation_rw: 'Mitochondria ikora ATP, amafaranga y\'ingufu z\'akaremangingo.', subjectCode: 'BIO', level: 'S4' },
            { id: 'bio002', topic: 'Genetics', difficulty: 'hard', text_en: 'What molecule carries genetic information?', text_rw: 'Ni iyihe molecule itwara amakuru y\'uruhererekane?', options_en: ['RNA', 'DNA', 'Protein', 'Lipid'], options_rw: ['RNA', 'DNA', 'Proteyine', 'Lipide'], correct: 1, explanation_en: 'DNA (deoxyribonucleic acid) carries the genetic instructions for all living organisms.', explanation_rw: 'DNA (deoxyribonucleic acid) itwara amabwiriza y\'uruhererekane ku bintu byose bibaho.', subjectCode: 'BIO', level: 'S5' },
            { id: 'bio003', topic: 'Ecology', difficulty: 'medium', text_en: 'What is a food chain?', text_rw: 'Urungano rw\'ibiryo ni iki?', options_en: ['A list of foods', 'The transfer of energy through organisms', 'A type of ecosystem', 'A group of animals'], options_rw: ['Urutonde rw\'ibiryo', 'Ihererekanya ry\'ingufu mu binyabuzima', 'Ubwoko bw\'ibidukikije', 'Itsinda ry\'inyamaswa'], correct: 1, explanation_en: 'A food chain shows how energy is transferred from one organism to another through eating.', explanation_rw: 'Urungano rw\'ibiryo rwerekana uko ingufu zihererekanywa mu binyabuzima binyuze mu kurya.', subjectCode: 'BIO', level: 'S4' },
        ],
        french: [
            { id: 'fre001', topic: 'Vocabulaire', difficulty: 'easy', text_en: 'What is "book" in French?', text_rw: '"Igitabo" mu Gifaransa ni iki?', options_en: ['Le livre', 'La maison', 'Le crayon', 'L\'école'], options_rw: ['Le livre', 'La maison', 'Le crayon', 'L\'école'], correct: 0, explanation_en: '"Book" in French is "le livre".', explanation_rw: '"Igitabo" mu Gifaransa ni "le livre".', subjectCode: 'FRE', level: 'P5' },
            { id: 'fre002', topic: 'Grammaire', difficulty: 'medium', text_en: 'What is the correct form? "Je ___ étudiant."', options_en: ['suis', 'es', 'est', 'sommes'], options_rw: ['suis', 'es', 'est', 'sommes'], correct: 0, explanation_en: '"Je suis" is the first person singular of "être" (to be).', explanation_rw: '"Je suis" ni umuntu wa mbere umwe wa "être" (kuba).', subjectCode: 'FRE', level: 'S1' },
        ],
        geography: [
            { id: 'geo001', topic: 'Physical Geography', difficulty: 'medium', text_en: 'What is the longest river in Africa?', text_rw: 'Ni uruhe ruzi rurerure muri Afurika?', options_en: ['Congo', 'Nile', 'Niger', 'Zambezi'], options_rw: ['Kongo', 'Nili', 'Nijeri', 'Zambezi'], correct: 1, explanation_en: 'The Nile River is the longest river in Africa, approximately 6,650 km.', explanation_rw: 'Uruzi rwa Nili ni rwo rurerure muri Afurika, hafi km 6,650.', subjectCode: 'GEO', level: 'S4' },
            { id: 'geo002', topic: 'Climate', difficulty: 'medium', text_en: 'What causes the seasons on Earth?', text_rw: 'Ni iki gitera ibihe by\'umwaka ku isi?', options_en: ['Distance from Sun', 'Tilt of Earth\'s axis', 'Moon\'s gravity', 'Solar flares'], options_rw: ['Intera uvuye ku zuba', 'Kwihina kw\'umutima w\'isi', 'Imbaraga z\'ukwezi', 'Umuriro w\'izuba'], correct: 1, explanation_en: 'Seasons are caused by the 23.5° tilt of Earth\'s rotational axis.', explanation_rw: 'Ibihe biterwa n\'ukwihina kw\'umutima w\'isi ku mpamyabumenyi ya 23.5°.', subjectCode: 'GEO', level: 'S4' },
        ],
        history: [
            { id: 'his001', topic: 'Rwandan History', difficulty: 'medium', text_en: 'What kingdom existed in Rwanda before colonization?', text_rw: 'Ni ubuhe bwami bwari mu Rwanda mbere y\'abakoroni?', options_en: ['Buganda', 'Kingdom of Rwanda', 'Bugesera', 'Burundi'], options_rw: ['Buganda', 'Ubwami bw\'u Rwanda', 'Bugesera', 'Burundi'], correct: 1, explanation_en: 'The Kingdom of Rwanda was a pre-colonial state ruled by the Mwami (king).', explanation_rw: 'Ubwami bw\'u Rwanda bwari igihugu cy\'mbere y\'abakoroni buyobowe n\'Umwami.', subjectCode: 'HIS', level: 'S4' },
        ],
        computerScience: [
            { id: 'com001', topic: 'Programming Basics', difficulty: 'easy', text_en: 'What does HTML stand for?', text_rw: 'HTML isobanura iki?', options_en: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Hyper Transfer Markup Language', 'Home Tool Markup Language'], options_rw: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Hyper Transfer Markup Language', 'Home Tool Markup Language'], correct: 0, explanation_en: 'HTML stands for HyperText Markup Language — the standard language for web pages.', explanation_rw: 'HTML isobanura HyperText Markup Language — ururimi rusanzwe rw\'imapaji z\'umurongo.', subjectCode: 'COM', level: 'S4' },
            { id: 'com002', topic: 'Data Structures', difficulty: 'hard', text_en: 'What data structure uses FIFO (First In, First Out)?', text_rw: 'Ni iyihe structure y\'amakuru ikoresha FIFO?', options_en: ['Stack', 'Queue', 'Tree', 'Graph'], options_rw: ['Stack', 'Queue', 'Tree', 'Graph'], correct: 1, explanation_en: 'A Queue uses FIFO — the first element added is the first one removed.', explanation_rw: 'Queue ikoresha FIFO — igice cya mbere cyongeweho ni cyo cya mbere gikurwaho.', subjectCode: 'COM', level: 'S5' },
        ],
    },

    init: function() {
        this.loadState();
        this.loadHistory();
    },

    saveState: function() {
        try {
            var s = {};
            for (var k in this.state) {
                if (k !== 'timerInterval') s[k] = this.state[k];
            }
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(s));
        } catch(e) {}
    },

    loadState: function() {
        try {
            var saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                var parsed = JSON.parse(saved);
                for (var k in parsed) {
                    if (k !== 'timerInterval') this.state[k] = parsed[k];
                }
            }
        } catch(e) {}
    },

    clearState: function() {
        this.state.phase = 'idle';
        this.state.opponent = null;
        this.state.currentQuestion = null;
        this.state.questions = [];
        this.state.answers = [];
        this.state.matchId = null;
        this.state.startedAt = null;
        this.state.currentRound = 0;
        this.state.playerScore = 0;
        this.state.opponentScore = 0;
        this.state.playerTurn = true;
        this.state.timer = 30;
        clearInterval(this.state.timerInterval);
        this.saveState();
    },

    loadHistory: function() {
        try {
            var saved = localStorage.getItem(this.HISTORY_KEY);
            if (saved) this.state.matchHistory = JSON.parse(saved);
        } catch(e) { this.state.matchHistory = []; }
    },

    saveHistory: function() {
        try {
            localStorage.setItem(this.HISTORY_KEY, JSON.stringify(this.state.matchHistory));
        } catch(e) {}
    },

    getTopicsForSubject: function(subjectKey) {
        var questions = this.questionBank[subjectKey];
        if (!questions) return [];
        var topics = {};
        questions.forEach(function(q) { topics[q.topic] = true; });
        return Object.keys(topics).sort();
    },

    getQuestions: function(subjectKey, level, topic, difficulty) {
        var bank = this.questionBank[subjectKey];
        if (!bank) return [];
        var filtered = bank.filter(function(q) {
            if (level && q.level !== level) return false;
            if (topic && topic !== 'all' && q.topic !== topic) return false;
            if (difficulty && difficulty !== 'adaptive' && q.difficulty !== difficulty) return false;
            return true;
        });
        return filtered;
    },

    shuffle: function(arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    },

    setPhase: function(phase) {
        this.state.phase = phase;
        this.saveState();
        var el = document.getElementById('game-phase');
        if (el) el.textContent = this.getPhaseText(phase);
    },

    getPhaseText: function(phase) {
        var lang = localStorage.getItem('ireme-lang') || 'en';
        var texts = {
            idle: { en: 'Ready', rw: 'Biteguye' },
            checking: { en: 'Checking eligibility...', rw: 'Kugenzura uburenganzira...' },
            searching: { en: 'Searching for opponent...', rw: 'Gushaka umukinnyi...' },
            found: { en: 'Opponent found!', rw: 'Umukinnyi yabonetse!' },
            preparing: { en: 'Preparing match...', rw: 'Gutegura umukino...' },
            ready: { en: 'Match ready!', rw: 'Umukino witeguye!' },
            playing: { en: 'In progress', rw: 'Birakinwa...' },
            completed: { en: 'Completed', rw: 'Byarangiye' },
        };
        return texts[phase] ? (texts[phase][lang] || phase) : phase;
    },

    generateMatchId: function() {
        return 'M' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    },

    validateSetup: function(pathway, level, subject) {
        var errors = [];
        if (!pathway) errors.push('Select an education pathway');
        if (!level) errors.push('Select an education level');
        if (!subject) errors.push('Select a subject');
        if (typeof IremeCurriculum !== 'undefined' && pathway && level) {
            var subjects = IremeCurriculum.getSubjectsForLevel(pathway, level);
            var found = subjects.some(function(s) { return s.key === subject; });
            if (!found && subjects.length > 0) errors.push('Subject not available for this level');
        }
        return errors;
    },

    startMatchmaking: function(pathway, level, subject, subjectName, topic, difficulty, language, duration, mode) {
        var errors = this.validateSetup(pathway, level, subject);
        if (errors.length > 0) {
            return { error: true, messages: errors };
        }

        this.state.pathway = pathway;
        this.state.level = level;
        this.state.subject = subject;
        this.state.subjectName = subjectName || subject;
        this.state.topic = topic || 'all';
        this.state.difficulty = difficulty || 'adaptive';
        this.state.language = language || 'en';
        this.state.duration = duration || 10;
        this.state.mode = mode || 'quick';
        this.state.totalRounds = Math.min(duration, 10);
        this.state.playerScore = 0;
        this.state.opponentScore = 0;
        this.state.currentRound = 0;
        this.state.answers = [];
        this.state.startedAt = new Date().toISOString();

        this.setPhase('checking');
        var self = this;

        var useApi = typeof IremeApi !== 'undefined' && IremeApi.findMatch;

        if (useApi) {
            // Use backend API for real multiplayer
            self.setPhase('searching');
            IremeApi.findMatch({
                subject: subject,
                subjectCode: subject,
                subjectName: subjectName || subject,
                level: level,
                pathway: pathway,
                topic: topic || 'all',
                difficulty: difficulty || 'adaptive',
                mode: mode || 'quick',
                totalRounds: self.state.totalRounds,
            }).then(function(data) {
                self.state.matchId = data.match.id;
                self.state.opponent = {
                    name: data.opponent.name,
                    initials: data.opponent.initials,
                    level: level,
                    pathway: pathway,
                    winRate: Math.floor(50 + Math.random() * 30),
                    isBot: data.opponent.isBot,
                };
                self.state.questions = data.questions || [];
                self.setPhase('found');
                setTimeout(function() {
                    self.setPhase('preparing');
                    setTimeout(function() {
                        self.setPhase('ready');
                        setTimeout(function() { self.startGameplay(); }, 1500);
                    }, 1500);
                }, 2000);
            }).catch(function(err) {
                console.error('findMatch error:', err);
                // Fallback to local mode
                self.startLocalMatchmaking();
            });
        } else {
            // Fallback to local mode (no API)
            this.startLocalMatchmaking();
        }

        return { error: false };
    },

    startLocalMatchmaking: function() {
        this.state.matchId = this.generateMatchId();
        this.setPhase('searching');
        var self = this;
        var delay = 2000 + Math.random() * 2000;
        setTimeout(function() {
            var names = ['Mugisha', 'Uwase', 'Ishimwe', 'Niyonzima', 'Habimana', 'Uwimana', 'Mukiza', 'Ndayisaba', 'Tuyishime', 'Nshimiyimana'];
            var firstNames = ['Jean', 'Marie', 'Pierre', 'Ange', 'Grace', 'Patrick', 'Diane', 'Eric', 'Aline', 'Thierry'];
            var fn = firstNames[Math.floor(Math.random() * firstNames.length)];
            var ln = names[Math.floor(Math.random() * names.length)];
            self.state.opponent = {
                name: fn + ' ' + ln,
                initials: (fn[0] + ln[0]).toUpperCase(),
                level: self.state.level,
                pathway: self.state.pathway,
                winRate: Math.floor(50 + Math.random() * 30),
                isBot: true,
            };
            self.setPhase('found');
            setTimeout(function() {
                self.setPhase('preparing');
                setTimeout(function() {
                    self.setPhase('ready');
                    setTimeout(function() { self.startGameplay(); }, 1500);
                }, 1500);
            }, 2000);
        }, delay);
    },

    startGameplay: function() {
        var questions = this.state.questions;
        if (!questions || questions.length === 0) {
            questions = this.getQuestions(this.state.subject, this.state.level, this.state.topic, this.state.difficulty);
        }
        if (questions.length === 0) {
            questions = this.getQuestions(this.state.subject);
        }
        if (questions.length === 0) {
            questions = this.questionBank.mathematics || [];
        }
        this.state.questions = this.shuffle(questions);
        this.state.playerTurn = true;
        this.state.currentRound = 0;
        this.setPhase('playing');
        this.saveState();
        this.nextRound();
    },

    nextRound: function() {
        this.state.currentRound++;
        if (this.state.currentRound > this.state.totalRounds) {
            this.endMatch();
            return;
        }
        var qIndex = (this.state.currentRound - 1) % this.state.questions.length;
        this.state.currentQuestion = this.state.questions[qIndex];
        this.state.timer = 30;
        this.saveState();
        this.updateGameUI();
        this.startTimer();
    },

    startTimer: function() {
        var self = this;
        clearInterval(this.state.timerInterval);
        this.state.timerInterval = setInterval(function() {
            self.state.timer--;
            var timerEl = document.getElementById('game-timer');
            if (timerEl) timerEl.textContent = self.state.timer;
            var arc = document.getElementById('timer-arc');
            if (arc) {
                var pct = self.state.timer / 30;
                arc.setAttribute('stroke-dasharray', (pct * 119) + ' 119');
            }
            var circle = document.getElementById('timer-circle');
            if (circle) {
                if (self.state.timer <= 8) circle.classList.add('urgent');
                else circle.classList.remove('urgent');
            }
            if (self.state.timer <= 0) {
                clearInterval(self.state.timerInterval);
                self.submitAnswer(-1);
            }
        }, 1000);
    },

    submitAnswer: function(answerIndex) {
        clearInterval(this.state.timerInterval);
        var q = this.state.currentQuestion;
        if (!q) return;

        var isCorrect = answerIndex === q.correct;
        var points = 0;

        if (isCorrect) {
            points = q.difficulty === 'hard' ? 3 : q.difficulty === 'medium' ? 2 : 1;
            this.state.playerScore += points;
        }

        var oppCorrect = Math.random() > 0.4;
        if (oppCorrect) {
            var oppPoints = q.difficulty === 'hard' ? 3 : q.difficulty === 'medium' ? 2 : 1;
            this.state.opponentScore += oppPoints;
        }

        this.state.answers.push({
            questionId: q.id,
            questionText: q.text_en,
            selectedAnswer: answerIndex,
            correctAnswer: q.correct,
            isCorrect: isCorrect,
            points: points,
            timeUsed: 30 - this.state.timer,
            roundNumber: this.state.currentRound,
        });

        this.saveState();

        // Send answer to backend if API is available
        var useApi = typeof IremeApi !== 'undefined' && IremeApi.submitGameAnswer && this.state.matchId;
        if (useApi && this.state.matchId && !this.state.matchId.startsWith('M')) {
            IremeApi.submitGameAnswer(this.state.matchId, {
                questionId: q.id,
                roundNumber: this.state.currentRound,
                selectedAnswer: answerIndex,
                isCorrect: isCorrect,
                points: points,
                timeUsed: 30 - this.state.timer,
            }).then(function(data) {
                // Sync scores from backend
                if (data.player1Score !== undefined) {
                    // Backend returned authoritative scores
                }
            }).catch(function(err) {
                // Silently continue with local scores
            });
        }

        this.showAnswerResult(isCorrect, points);
    },

    showAnswerResult: function(isCorrect, points) {
        var q = this.state.currentQuestion;
        var lang = this.state.language;
        var feedbackEl = document.getElementById('game-result-feedback');
        if (!feedbackEl) return;

        var options = lang === 'rw' ? q.options_rw : q.options_en;
        var explanation = lang === 'rw' ? q.explanation_rw : q.explanation_en;
        var titleText = isCorrect
            ? (lang === 'rw' ? 'Igisubizo nyacyo! +' + points + ' amanota' : 'Correct! +' + points + ' points')
            : (lang === 'rw' ? 'Igisubizo kitari cyo' : 'Incorrect');

        var iconClass = isCorrect ? 'correct' : 'wrong';
        var panelClass = isCorrect ? '' : ' wrong';
        var iconFa = isCorrect ? 'fa-check-circle' : 'fa-times-circle';

        feedbackEl.innerHTML = '<div class="explanation-panel' + panelClass + '">' +
            '<span class="exp-icon ' + iconClass + '"><i class="fa ' + iconFa + '"></i></span>' +
            '<div><strong>' + titleText + '</strong>' +
            '<p>' + explanation + '</p></div></div>';

        var p1s = document.getElementById('p1-score');
        var p2s = document.getElementById('p2-score');
        if (p1s) p1s.textContent = this.state.playerScore;
        if (p2s) p2s.textContent = this.state.opponentScore;

        var self = this;
        setTimeout(function() { self.nextRound(); }, 4000);
    },

    updateGameUI: function() {
        var q = this.state.currentQuestion;
        if (!q) return;
        var lang = this.state.language;

        var roundEl = document.getElementById('game-round-num');
        if (roundEl) roundEl.textContent = this.state.currentRound;
        var totalEl = document.getElementById('game-total-rounds');
        if (totalEl) totalEl.textContent = this.state.totalRounds;

        var progressPct = (this.state.currentRound / this.state.totalRounds) * 100;
        var progressBar = document.getElementById('match-progress-bar');
        if (progressBar) progressBar.style.width = progressPct + '%';

        var topicEl = document.getElementById('game-topic');
        if (topicEl) topicEl.textContent = q.topic.toUpperCase();

        var diffEl = document.getElementById('game-difficulty-badge');
        if (diffEl) {
            var diffText = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
            diffEl.textContent = diffText[q.difficulty] || q.difficulty;
        }

        var questionEl = document.getElementById('game-question-text');
        if (questionEl) {
            var qText = lang === 'rw' ? q.text_rw : q.text_en;
            questionEl.innerHTML = qText.replace(/(\d+[\+\-\×\÷\=x][\d\+\-\×\÷\=\sx]+)/gi, '<em>$1</em>');
        }

        var optionsEl = document.getElementById('game-options');
        if (optionsEl) {
            var options = lang === 'rw' ? q.options_rw : q.options_en;
            optionsEl.innerHTML = options.map(function(opt, i) {
                return '<button class="answer-btn" onclick="IremeGame.selectAnswer(' + i + ')" id="answer-' + i + '">' +
                    '<span class="answer-letter">' + String.fromCharCode(65 + i) + '</span>' +
                    '<span class="answer-text">' + opt + '</span>' +
                    '<i class="fa fa-check answer-check"></i>' +
                    '</button>';
            }).join('');
        }

        var turnEl = document.getElementById('game-turn-indicator');
        if (turnEl) {
            turnEl.innerHTML = '<span class="your-turn">' + (lang === 'rw' ? 'NI UKWAWE' : 'YOUR TURN') + '</span>';
        }

        var timerEl = document.getElementById('game-timer');
        if (timerEl) timerEl.textContent = this.state.timer;

        var p1s = document.getElementById('p1-score');
        var p2s = document.getElementById('p2-score');
        if (p1s) p1s.textContent = this.state.playerScore;
        if (p2s) p2s.textContent = this.state.opponentScore;

        var p1Pct = Math.max(20, (this.state.playerScore / (this.state.totalRounds * 3)) * 100);
        var p2Pct = Math.max(20, (this.state.opponentScore / (this.state.totalRounds * 3)) * 100);
        var p1h = document.getElementById('p1-health');
        var p2h = document.getElementById('p2-health');
        if (p1h) p1h.style.width = Math.min(100, p1Pct) + '%';
        if (p2h) p2h.style.width = Math.min(100, p2Pct) + '%';

        if (this.state.opponent) {
            var oppAv = document.getElementById('p2-avatar');
            var oppName = document.getElementById('p2-name');
            if (oppAv) oppAv.textContent = this.state.opponent.initials || 'OP';
            if (oppName) oppName.textContent = this.state.opponent.name;
        }

        var user = null;
        if (typeof IremeAuth !== 'undefined' && IremeAuth.getCurrentUser) user = IremeAuth.getCurrentUser();
        if (user) {
            var initials = user.fullName.split(' ').map(function(n) { return n[0]; }).join('').slice(0, 2).toUpperCase();
            var p1av = document.getElementById('p1-avatar');
            var p1name = document.getElementById('p1-name');
            if (p1av) p1av.textContent = initials;
            if (p1name) p1name.textContent = user.fullName;
        }

        var feedbackEl = document.getElementById('game-result-feedback');
        if (feedbackEl) feedbackEl.innerHTML = '';
    },

    selectAnswer: function(index) {
        var btns = document.querySelectorAll('.answer-btn');
        btns.forEach(function(btn) { btn.classList.add('disabled'); btn.onclick = null; });

        var q = this.state.currentQuestion;
        var isCorrect = index === q.correct;
        if (isCorrect) {
            document.getElementById('answer-' + index).classList.add('correct');
        } else {
            document.getElementById('answer-' + index).classList.add('incorrect');
            document.getElementById('answer-' + q.correct).classList.add('correct');
        }
        this.submitAnswer(index);
    },

    endMatch: function() {
        clearInterval(this.state.timerInterval);
        this.setPhase('completed');

        var playerWon = this.state.playerScore > this.state.opponentScore;
        var isDraw = this.state.playerScore === this.state.opponentScore;
        var correctCount = this.state.answers.filter(function(a) { return a.isCorrect; }).length;
        var accuracy = this.state.totalRounds > 0 ? Math.round((correctCount / this.state.totalRounds) * 100) : 0;

        var matchRecord = {
            matchId: this.state.matchId,
            date: new Date().toLocaleDateString(),
            timestamp: new Date().toISOString(),
            subject: this.state.subject,
            subjectName: this.state.subjectName,
            level: this.state.level,
            pathway: this.state.pathway,
            topic: this.state.topic,
            difficulty: this.state.difficulty,
            mode: this.state.mode,
            opponent: this.state.opponent ? this.state.opponent.name : 'AI',
            playerScore: this.state.playerScore,
            opponentScore: this.state.opponentScore,
            result: playerWon ? 'win' : isDraw ? 'draw' : 'loss',
            accuracy: accuracy,
            correctCount: correctCount,
            totalRounds: this.state.totalRounds,
            answers: this.state.answers,
        };

        this.state.matchHistory.unshift(matchRecord);
        if (this.state.matchHistory.length > 50) this.state.matchHistory = this.state.matchHistory.slice(0, 50);
        this.saveHistory();
        this.saveState();

        // Save match to backend
        var useApi = typeof IremeApi !== 'undefined';
        if (useApi) {
            var isBackendMatch = this.state.matchId && !this.state.matchId.startsWith('M');
            if (isBackendMatch && IremeApi.completeMatch) {
                IremeApi.completeMatch(this.state.matchId, {
                    playerScore: this.state.playerScore,
                    opponentScore: this.state.opponentScore,
                    answers: this.state.answers,
                }).catch(function(err) { /* silent fallback */ });
            } else if (IremeApi.saveMatch) {
                IremeApi.saveMatch({
                    subject: this.state.subject,
                    subjectName: this.state.subjectName,
                    level: this.state.level,
                    pathway: this.state.pathway,
                    topic: this.state.topic,
                    difficulty: this.state.difficulty,
                    mode: this.state.mode,
                    totalRounds: this.state.totalRounds,
                    playerScore: this.state.playerScore,
                    opponentScore: this.state.opponentScore,
                    opponentName: this.state.opponent ? this.state.opponent.name : 'AI',
                    answers: this.state.answers,
                }).catch(function(err) { /* silent fallback */ });
            }
        }

        return matchRecord;
    },

    cancelMatchmaking: function() {
        clearInterval(this.state.timerInterval);
        this.clearState();
    },

    getMatchHistory: function() {
        return this.state.matchHistory;
    },

    getLastResult: function() {
        return this.state.matchHistory.length > 0 ? this.state.matchHistory[0] : null;
    }
};

var IremeGameUI = {
    showResults: function(record) {
        var container = document.getElementById('game-results-container');
        if (!container || !record) return;
        window.location.href = 'game-result.html';
    },

    renderHistory: function() {
        var lang = localStorage.getItem('ireme-lang') || 'en';
        var history = IremeGame.getMatchHistory();
        var container = document.getElementById('game-history-list');
        if (!container) return;

        if (history.length === 0) {
            container.innerHTML = '<div class="text-center py-4"><p style="font-size:11px;color:#6B7A99;margin:0;">' +
                (lang === 'rw' ? 'Nta mikino irakinwa. Tangira gukina!' : 'No matches played yet. Start playing!') + '</p></div>';
            return;
        }

        container.innerHTML = history.slice(0, 10).map(function(m) {
            var badgeClass = m.result;
            var resultLabel = m.result === 'win' ? (lang === 'rw' ? 'Watsinze' : 'Won') : m.result === 'draw' ? (lang === 'rw' ? 'Manganye' : 'Draw') : (lang === 'rw' ? 'Watsinzwe' : 'Lost');
            return '<div class="game-history-item">' +
                '<span class="result-badge ' + badgeClass + '">' + resultLabel + '</span>' +
                '<div><strong>' + (m.subjectName || m.subject || '').toUpperCase() + ' · ' + (m.level || '') + '</strong>' +
                '<small>vs ' + (m.opponent || 'AI') + ' · ' + m.date + '</small></div>' +
                '<span class="score">' + m.playerScore + ' – ' + m.opponentScore + '</span>' +
                '</div>';
        }).join('');
    }
};

document.addEventListener('DOMContentLoaded', function() {
    if (typeof IremeGame !== 'undefined') IremeGame.init();
});
