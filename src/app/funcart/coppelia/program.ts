// Conteúdo do programa impresso de Coppélia (FUNCART), transcrito do .docx.

export interface Dance {
  id: string;
  title: string;
  group?: string;
  soloist?: string;
  cast: string[];
  /** Papéis que se revezam entre as noites ("ou;" no programa). */
  alternating?: boolean;
}

export interface Act {
  id: string;
  numeral: string;
  label: string;
  synopsis: string[];
  dances: Dance[];
}

export interface Program {
  id: "1" | "2";
  label: string;
  dates: string;
  poster: { src: string; alt: string };
  characters: { role: string; name: string }[];
  acts: Act[];
}

export const EVENT = {
  presenter: "Escola Municipal de Dança de Londrina apresenta",
  title: "Coppélia",
};

const CHARACTERS_1: Program["characters"] = [
  { role: "Swanilda", name: "Fernanda Cereda Dale Vedove" },
  { role: "Franz", name: "Daniel de Oliveira" },
  { role: "Boneca Coppélia", name: "Rafaela Cereda Dale Vedove" },
  { role: "Doutor Coppelius", name: "Marciano Boletti" },
  { role: "Padre", name: "Marcelo Alexandre Anastácio" },
  { role: "Prefeito", name: "Will Lima" },
];

const ACTS_1: Act[] = [
  {
    id: "ato-1",
    numeral: "I",
    label: "1º ato",
    synopsis: [
      "Numa vila de altas casas e telhados pontudos no interior da Polônia, vivem Swanilda - uma linda jovem, e Doutor Coppelius, um fabricante de brinquedos de corda. Swanilda se vê curiosa por uma menina, Coppélia, que dizem ser filha de Coppelius. O motivo de seu interesse é acreditar que Franz, seu noivo, está apaixonado pela moça. Swanilda procura atrair sua atenção, mas inutilmente. Aparece Franz que se dirige para a casa misteriosa enquanto Swanilda se esconde. Ele atira um beijo para Coppélia, que parece responder, e logo se senta. Swanilda aparece, fingindo nada ter visto, e censura-o por lhe ser infiel.",
      "Uma alegre multidão enche a praça. O Prefeito anuncia que o Senhor do Castelo ofertou um sino à vila e isso será celebrado com uma festa onde muitos casais se unirão e receberão dotes. Interrogada sobre seu casamento, Swanilda está em dúvida. Ela apanha uma espiga de trigo, que por tradição ao ser balançada e emitir um som simboliza a alegria do relacionamento, mas como nada ouve termina o noivado.",
      "Cai a noite e Coppelius, ao sair de casa, se depara com um grupo de rapazes que o obrigam a dançar e ao desvencilhar-se deles perde sua chave. Swanilda e suas amigas encontram-na, e curiosas, adentram à misteriosa fábrica de Coppelius.",
    ],
    dances: [
      {
        id: "mazurca",
        title: "Mazurca",
        group: "5º ano, 6º ano e Aperfeiçoamento – Professor Marciano Boletti",
        cast: [
          "Alice Ribeiro Lopes",
          "Amanda Angelina Nishikawa Silva",
          "Ana Julia Francisco dos Santos",
          "Analu Caetano Alves Seret Lion",
          "Chauester Gabriel Teodoro Pereira",
          "Alex Imes Filho",
          "Emanuelly Dedin de Oliveira",
          "Gabriel Arantes Fernandes",
          "Geórgia Hirakawa Araújo",
          "Isabela Fajardo de Andrade Lima",
          "Isabela Oliveira Hummig",
          "Julia Fernanda Godoi Ariza",
          "Kauane de Lima Lucas",
          "Leticia Ayumi Nakanishi",
          "Mariana Lumi Osawa Fiorini",
          "Pietra Chenso Pedroso",
          "Victor Jacinto Terra",
          "Willer Sueiro de Medeiros",
          "Yasmin Soares Luz Castilho",
        ],
      },
      {
        id: "amigas",
        title: "Amigas",
        group: "7º ano, 8º ano e Aperfeiçoamento – Professores Marciano Boletti e Renata Doi",
        cast: [
          "Ana Sara Andrade Moretão Cunha",
          "Beatriz Brito da Silva",
          "Beatriz Pereira de Souza",
          "Emanuelly Vitoria Imes",
          "Gabriela Teixeira Ernegas",
          "Heloisa Pereira Correia",
          "Maria Alice Rodrigues Pereira",
          "Maria Eduarda de Souza Bino",
          "Maria Eduarda Fagundes de Melo",
          "Maria Luiza Rodrigues Ivasita",
        ],
      },
      {
        id: "czardas",
        title: "Czardas",
        group: "5º e 6º ano – Professores Marciano Boletti e Thacyane Vargas",
        cast: [
          "Alice Lopes Maldonado",
          "Aline Sayuri Duarte Tsujoka",
          "Amanda Angelina Nishikawa Silva",
          "Isabeli Mayumi Abbe",
          "Julia Carolinne Silva Vicente",
          "Maria Luiza Bertoleti",
          "Maria Vitoria Alfredo de Souza",
          "Maria Vitoria Gomes da Silva",
          "Milaine Raquel Cruciol Caobianco",
          "Natalia Antonela de Carvalho Garcia",
          "Sofia Alexandre Vallim",
          "Yasmin Cocato Weffort",
        ],
      },
    ],
  },
  {
    id: "ato-2",
    numeral: "II",
    label: "2º ato",
    synopsis: [
      "Swanilda e suas amigas, temerosas, penetram na casa de Coppelius e tentam interagir com Coppélia. Descobrem que ela é uma boneca e resolvem colocar todos os bonecos para dançar. Ao chegar, Coppelius fica furioso com a invasão e expulsa todas elas. Swanilda se esconde e vê Franz entrar, subindo por uma escada e se declarando apaixonado por Coppélia.",
      "Doutor Coppelius convida Franz para tomar um vinho, com a intenção de infundir em Coppélia a força vital do rapaz, orientando-se por um livro de magia. Nesse meio tempo, Swanilda, que estava escondida, coloca o vestido da boneca e toma-lhe o lugar, despertando Franz e ativando todos os bonecos para facilitar sua fuga enquanto Coppelius descobre sua verdadeira boneca, rígida e sem vida, percebendo que foi ludibriado.",
    ],
    dances: [
      {
        id: "bonecas-chinesas",
        title: "Bonecas Chinesas",
        group: "2º ano – Professor Claudio de Souza",
        cast: [
          "Ana Clara Peçanha da Silva Soares",
          "Ana Luiza de Lima Bilhão",
          "Bianca Fabris",
          "Bianca Miato Caetani",
          "Laura Cleto Vivian",
          "Lorena Torcato Alves",
          "Manuella de Lima da Cruz",
          "Maria Clara Soares Pezzotti",
          "Maria Luiza Bueno Civalsci",
          "Sophia Gabriela Pezzotti",
          "Sophia Gomes de Lima",
          "Sophia Vitoria de Almeida",
          "Yasmin Moura Feitosa",
        ],
      },
      {
        id: "bonecas-espanholas",
        title: "Bonecas Espanholas",
        group: "5º ano – Professores Claudio de Souza e Thayná Rodrigues",
        soloist: "Camila Caramori Aparecido",
        cast: [
          "Ana Laura de Mendonça Oliveira",
          "Carol Caramori Aparecido",
          "Geovanna Assencio Souza",
          "Isabella Santos Nacour",
          "Maria Eduarda Fernandes Celestina",
          "Shara Louyse Pereira Costa",
          "Yasmin Steffan Oliveira",
        ],
      },
      {
        id: "arlequin",
        title: "Arlequin",
        group: "2º ano – Professora Alessandra Menegazzo",
        cast: [
          "Ana Caramori Coutinho",
          "Ana Madkur Horvatich Beffa",
          "Beatriz Ferraz Birindelli",
          "Heloisa Fritzen Pegoretti",
          "Isabela Ribeiro Marques",
          "Isadora Pinceli Foloni",
          "Kathlyn Vitória Lacerda",
          "Laura Dedin dos Santos",
          "Lorena Costa Ribeiro",
          "Maria Eduarda Chaves Bianchi",
          "Valentina Marques Fiori",
        ],
      },
      {
        id: "marionetes",
        title: "Marionetes",
        group: "5º e 6º ano – Professor Marciano Boletti",
        cast: [
          "Alice Ribeiro Lopes",
          "Emanuelly Dedin de Oliveira",
          "Kauane de Lima Lucas",
          "Pietra Chenso Pedroso",
          "Yasmin Soares Luz Castilho",
        ],
      },
      {
        id: "bonecos-escoceses",
        title: "Bonecos Escoceses",
        group: "2º ano – Professora Eduarda Nishikawa",
        cast: [
          "Agatha Victoria Malaquias Alves",
          "Alice de Oliveira Luiz Galbero",
          "Ana Julia Palma de Andrade",
          "Antonella Taschetti Camargo",
          "Cecília Campos de Oliveira",
          "Heloísa Vitoreli Shmidt",
          "Lívia Nantes Nascimento",
          "Luan Rafael Pereira de Oliveira",
          "Maitê Campos Yurack",
          "Marina Mie Obara Gouvea",
          "Natália Carolina da Silva",
          "Valentina Dionizio Pinheiro",
        ],
      },
    ],
  },
  {
    id: "ato-3",
    numeral: "III",
    label: "3º ato",
    synopsis: [
      "Chega o dia da cerimônia de casamento, onde muitos pares irão se casar dentre eles Franz e Swanilda, e o sino será bento. Doutor Coppelius abre caminho entre os presentes e exige uma indenização pelos prejuízos causados a seus bonecos, recebendo uma bolsa de dinheiro. Iniciam-se os festejos onde os trabalhadores da colheita dançam. O sineiro chama as horas matinais e em seguida a Aurora e a Prece. O sino toca e anuncia o casamento, abençoado pelos Anjos. A Felicidade toma conta do ambiente e novamente a paz volta a reinar.",
    ],
    dances: [
      {
        id: "camponeses-do-dote",
        title: "Camponeses do Dote",
        group: "4º ano – Professora Thacyane Vargas",
        cast: [
          "Emy Takahashi",
          "Isabella Maria Betoni Dias Koronoma",
          "Maria Beatriz Villas Boas Teixeira",
          "Mariana Doirado Moreira",
          "Mariana Emily Gabriel",
          "Nathalyn Heloiza Martins Dias",
        ],
      },
      {
        id: "valsa-das-horas",
        title: "Valsa das Horas",
        group: "6º, 7º, 8º ano e Aperfeiçoamento – Professores Marciano Boletti e Renata Doi",
        cast: [
          "Aline Sayuri Duarte Tsujoka",
          "Ana Sara Moretão Cunha",
          "Beatriz Pereira de Souza",
          "Diulia Ferreira Brene",
          "Emanuelly Vitoria Imes",
          "Heloisa Pereira Correia",
          "Laura Negreiros Martins",
          "Luiza Vitoria Rodrigues",
          "Maria Alice Rodrigues Pereira",
          "Maria Eduarda de Souza Bino",
          "Maria Eduarda Fagundes de Melo",
          "Maria Luiza Bertoleti",
          "Maria Luiza Rodrigues Ivasita",
          "Maria Vitoria Alfredo de Souza",
          "Yasmin Cocato Weffort",
        ],
      },
      {
        id: "camponeses",
        title: "Camponeses",
        group: "Aperfeiçoamento e 6º ano – Professor Marciano Boletti",
        cast: ["Eduarda Nishikawa", "Gabriel Arantes Fernandes"],
      },
      {
        id: "o-amanhecer",
        title: "O Amanhecer",
        group: "Solista do 7º ano – Professores Marciano Boletti e Renata Doi",
        soloist: "Maria Alice Rodrigues Pereira",
        cast: [],
      },
      {
        id: "a-prece",
        title: "A Prece",
        group: "Solista do 7º ano – Professores Marciano Boletti e Renata Doi",
        soloist: "Diulia Ferreira Brene",
        cast: [],
      },
      {
        id: "camponeses-do-trigo",
        title: "Camponeses do Trigo",
        group: "3º e 4º ano – Professor Claudio de Souza",
        cast: [
          "Camilly Victoria da Silva Palharoni",
          "Elisa Andreotti dos Reis",
          "Giovanna Benevides Alves",
          "Helena Santos Leal",
          "Helena Silva Fragoso",
          "Isadora Costa Oliveira",
          "Lara Rodrigues Alves",
          "Laura Gaspar Santos",
          "Laura Guilherme Felicio",
          "Maria Clara Abrahão de Lima",
          "Rebeca Christine da Silva",
          "Renata Araujo Nazario",
        ],
      },
      {
        id: "camponeses-floristas",
        title: "Camponeses Floristas",
        group: "3º ano – Professora Eduarda Nishikawa",
        cast: [
          "Alice Martins Borges",
          "Alice Moreira Lima",
          "Heloisa Prudente Pedro",
          "Isabeli Maria da Silva",
          "Lais Hokari Mukai",
          "Lara Teodoro Palmeira",
          "Laura Antunes da Silva",
          "Lia Baptistatti Nunes",
          "Luisa Furtado Godoy",
          "Maitê Mendes Rodrigues",
          "Maria Carolina Morais e Silva",
          "Maria Ester Cavalcante de Freitas",
          "Maria Teresa Dorigon Contato",
          "Rebeca Carballal Gomes",
          "Sofia Laura Nishikawa Silva",
          "Valentina Simões Santos",
          "Valentina Soares Luz Castilho",
        ],
      },
      {
        id: "cupido",
        title: "Cupido",
        group: "5º e 6º ano – Professores Marciano Boletti e Thacyane Vargas",
        alternating: true,
        cast: ["Maria Luiza Bertoleti", "Maria Vitoria Alfredo de Souza", "Yasmin Cocato Weffort"],
      },
      {
        id: "a-felicidade",
        title: "A Felicidade",
        group: "Solistas do 8º ano e Aperfeiçoamento – Professores Marciano Boletti e Renata Doi",
        alternating: true,
        cast: ["Milaine Raquel Cruciol Caobianco", "Beatriz Pereira de Souza"],
      },
      {
        id: "o-casamento",
        title: "O Casamento",
        cast: ["Fernanda Cereda Dale Vedove", "Daniel de Oliveira"],
      },
    ],
  },
];

// Programa 2: mesmos atos e sinopses; aqui só o que muda em relação ao Programa 1.
const CHARACTERS_2: Program["characters"] = [
  { role: "Swanilda", name: "Lorena Brito Macedo" },
  { role: "Franz", name: "Matheus Nemoto (convidado Ballet de Londrina)" },
  { role: "Boneca Coppélia", name: "Yasmin Cocato Weffort" },
  { role: "Doutor Coppelius", name: "Marciano Boletti" },
  { role: "Padre", name: "Marcelo Alexandre Anastácio" },
  { role: "Prefeito", name: "Will Lima" },
];

const DANCES_2: Record<string, Partial<Dance>> = {
  "bonecas-chinesas": {
    group: "2º ano – Professora Thayná Rodrigues",
    cast: [
      "Alice Brito Chuman",
      "Alice dos Santos Valloto",
      "Ana Clara Batista da Silva",
      "Lara Alves Moreira",
      "Leticia Nunes da Silva",
      "Lorena Lagos Bida",
      "Maria Joana Abrantes Sarmento",
    ],
  },
  "bonecas-espanholas": {
    soloist: "Shara Louyse Pereira Costa",
    cast: [
      "Ana Laura de Mendonça Oliveira",
      "Camila Caramori Aparecido",
      "Carol Caramori Aparecido",
      "Geovanna Assencio Souza",
      "Isabella Santos Nacour",
      "Maria Eduarda Fernandes Celestina",
      "Yasmin Steffan Oliveira",
    ],
  },
  arlequin: {
    group: "2º ano – Professora Rosangela Homem",
    cast: [
      "Alice Balduino Lorenzzetti",
      "Alice Bortoto de Oliveira",
      "Helena Marcele Beani de Souza",
      "Luiza de Souza",
      "Maria Antonella Brites de Almeida",
      "Maria Flor Soares Santana",
    ],
  },
  "bonecos-escoceses": {
    cast: [
      "Ana Beatriz Quirino Nascimento",
      "Antonia Machado da Cruz",
      "Emanuela Matia de Oliveira",
      "Helena Ferreira e Mattos",
      "Laura Mitsuko Nagai",
      "Liz Harumi Nagai",
      "Marcelo Alexandre Anastacio",
      "Maria Alice Galdino Carvalho",
      "Maria Ferreira e Mattos",
      "Maria Luiza de Souza Silva",
      "Sophia Martins Pereira",
    ],
  },
  "camponeses-do-dote": {
    group: "4º ano – Professora Eduarda Nishikawa",
    cast: [
      "Alex Imes Filho",
      "Ana Laura Fudoli Rodrigues",
      "Ana Ponte Carvalho França",
      "Cecilia Assenço Melchiades",
      "Eliza Alves Elesbão",
      "Hannah Fernandes Alves",
      "Laura Carballal Gomes",
      "Melissa Domingues Freitas",
      "Rafaela Cereda Dale Vedove",
      "Sarah Fernandes Alves",
      "Willer Sueiro de Medeiros",
    ],
  },
  camponeses: {
    group: "Aperfeiçoamento e 8º ano – Professor Marciano Boletti",
    cast: ["Renata Doi", "Jasão Padilha"],
  },
  "o-amanhecer": {
    group: "Aperfeiçoamento – Professores Marciano Boletti e Renata Doi",
    soloist: "Vitória Caroline Martins Correa",
  },
  "a-prece": {
    group: "Aperfeiçoamento – Professores Marciano Boletti e Renata Doi",
    soloist: "Maria Eduarda Fagundes de Melo",
  },
  "camponeses-do-trigo": {
    group: "3º e 4º ano – Professora Thayná Rodrigues",
    cast: [
      "Diego Gregório Roberto",
      "Eloa Isabely Marques de Souza",
      "Isabela Alves da Rocha",
      "Isadora Gomes de Souza",
      "Julia Aquino Moura",
      "Lara Yasmin Oliveira dos Santos",
      "Lavinia de Araujo Rosa",
      "Maria Emanuela Dão Viesba Costa",
      "Mariana Galdin Nunes da Silva",
      "Michelly Rafaella Souza Rodrigues",
      "Rebeca Vitoria Manhenti Goubetti",
      "Yasmin Vitoria Dominguês de Morais",
    ],
  },
  "camponeses-floristas": {
    title: "Floristas",
    group: "3º ano – Professora Rosangela Homem",
    cast: [
      "Elena Rosa Giuliese",
      "Gabriela Costa Vieira",
      "Gabrielli Ieda Lima",
      "Giovanna Fatureto Freitas",
      "Isabela Theodoro Silva",
      "Laura de Oliveira",
      "Manuela Klein",
      "Maria Luiza Vidotti Gendorf",
      "Olivia da Cruz Toledo",
      "Sara Perezin Cardoso",
      "Sarah Froes Kassa",
      "Sofia Dávila Bucci",
      "Sophia Costa Vieira",
      "Yasmin Durigon Da Silva",
    ],
  },
  "a-felicidade": {
    group: "Aperfeiçoamento – Professores Marciano Boletti e Renata Doi",
    alternating: false,
    soloist: "Gabriela Teixeira Ernegas",
    cast: [],
  },
  "o-casamento": {
    cast: ["Lorena Brito Macedo", "Matheus Nemoto (bailarino convidado do Ballet de Londrina)"],
  },
};

const ACTS_2: Act[] = ACTS_1.map((act) => ({
  ...act,
  dances: act.dances.map((d) => ({ ...d, ...DANCES_2[d.id] })),
}));

export const PROGRAMS: Program[] = [
  {
    id: "1",
    label: "Programa 1",
    dates: "26 e 28 de novembro",
    poster: {
      src: "/funcart/coppelia/capa-p1-braco-erguido.webp",
      alt: "Cartaz de Coppélia: bailarina de braço erguido e o Doutor Coppelius escutando atrás dela, em cenário com engrenagens e relógios dourados",
    },
    characters: CHARACTERS_1,
    acts: ACTS_1,
  },
  {
    id: "2",
    label: "Programa 2",
    dates: "27 e 29 de novembro",
    poster: {
      src: "/funcart/coppelia/capa-p2-bracos-cruzados.webp",
      alt: "Cartaz de Coppélia: bailarina de vestido branco com laços rosa e o Doutor Coppelius lendo um livro, em cenário com engrenagens e relógios dourados",
    },
    characters: CHARACTERS_2,
    acts: ACTS_2,
  },
];

/** Abertura da noite: "A Casa de Brinquedos", com as turmas menores. */
export interface Opening {
  id: string;
  title: string;
  /** Turma que apresenta a abertura nesta noite. */
  cohort: string;
  synopsis: string[];
  characters: { role: string; name: string }[];
  dances: Dance[];
  teachers: string;
}

/** Uma sessão do dia: ou o Coppélia (com seu programa), ou A Casa de Brinquedos, em horário separado. */
export interface Session {
  /** "28" = Coppélia do dia 28; "28-casa" = A Casa de Brinquedos do dia 28. */
  id: string;
  day: number;
  kind: "coppelia" | "casa";
  /** Horário como aparece no programa: a Casa de Brinquedos é à tarde, o Coppélia às 20h. */
  time: string;
  programId?: Program["id"];
  opening?: Opening;
}

const CASA_SYNOPSIS = [
  "Em uma aldeia no interior da Polônia vive o Doutor Coppelius, um fabricante de brinquedos que mora em uma casa com alpendre onde está uma graciosa boneca chamada Coppélia.",
  "Certo dia, ao fechar a porta distraidamente, ele perde a chave. Um grupo de crianças sapecas e curiosas, lideradas por Swanilda, vê o ocorrido, apanha a chave e abre o local. Maravilhadas, elas andam por tudo e investigam todos os brinquedos: Bonecas Chinesas, Bonecas Espanholas, Arlequins, Marionetes, Bonecas Escocesas, e Bailarinas de caixinha de música. Num clima de magia, os brinquedos interagem com as crianças e começam a dançar. Enquanto elas se divertem, perdem a noção das horas completamente.",
  "Coppelius percebe que perdeu a chave e volta para procurar quando encontra as crianças dentro da casa. Ele fica furioso e expulsa todas elas de lá. As crianças se arrependem de terem invadido a casa sem autorização e pedem desculpas a Doutor Coppelius. Ele aceita as desculpas e as convida para frequentarem a casa sempre que desejarem.",
];

const CASA_CRIANCAS = [
  "Ana Sara Andrade Moretão Cunha",
  "Beatriz Brito da Silva",
  "Beatriz Pereira de Souza",
  "Emanuelly Vitoria Imes",
  "Gabriela Teixeira Ernegas",
  "Heloisa Pereira Correia",
  "Maria Alice Rodrigues Pereira",
  "Maria Eduarda de Souza Bino",
  "Maria Eduarda Fagundes de Melo",
  "Maria Luiza Rodrigues Ivasita",
];

const CASA_MARIONETES = [
  "Alice Ribeiro Lopes",
  "Emanuelly Dedin de Oliveira",
  "Kauane de Lima Lucas",
  "Pietra Chenso Pedroso",
  "Yasmin Soares Luz Castilho",
];

const CASA_FELICIDADE = ["Milaine Raquel Cruciol Caobianco", "Beatriz Pereira de Souza"];

const CASA_1_ANO: Opening = {
  id: "casa-de-brinquedos",
  title: "A Casa de Brinquedos",
  cohort: "1º ano",
  synopsis: CASA_SYNOPSIS,
  characters: [
    { role: "Swanilda", name: "Lorena Brito Macedo" },
    { role: "Doutor Coppelius", name: "Marciano Boletti" },
  ],
  dances: [
    {
      id: "casa-criancas",
      title: "As Crianças",
      group: "7º ano, 8º ano e Aperfeiçoamento – Professores Marciano Boletti e Renata Doi",
      cast: CASA_CRIANCAS,
    },
    {
      id: "casa-bonecas-chinesas",
      title: "Bonecas Chinesas",
      group: "1º ano noturno – Professora Eduarda Nishikawa",
      cast: [
        "Briana Gibin Kruega",
        "Luana Ferreira da Fonseca",
        "Marcella Calabrez Rosa",
        "Maria Clara Torchetti",
        "Pyetra Alexsandra Rodrigues",
        "Verena de Souza Lima",
      ],
    },
    {
      id: "casa-bonecas-espanholas",
      title: "Bonecas Espanholas",
      group: "1º ano vespertino – Professora Eduarda Nishikawa",
      soloist: "Carol Caramori Aparecido (Aperfeiçoamento)",
      cast: [
        "Alexia Mendes Augusto",
        "Clara Bianquini Munhoz",
        "Emilly de Souza",
        "Lara Martins Borges",
        "Leticia Cassoli Batilani",
        "Mariana Lameo Semprebom",
        "Milena Miyadera Fazolo",
        "Sofia Gonçalves Lopes",
        "Sophie Ayumi Torres",
        "Yara Vedovati Inacio",
      ],
    },
    {
      id: "casa-arlequin",
      title: "Arlequin",
      group: "1º ano – Professor Claudio de Souza",
      cast: [
        "Ana Julia Antunes Basso",
        "Kyara Reginaldo Basilio",
        "Lívia de Souza Moraes",
        "Valentina Vitoria Veronez Borges de Souza",
      ],
    },
    {
      id: "casa-marionetes",
      title: "Marionetes",
      group: "5º e 6º ano – Professor Marciano Boletti",
      cast: CASA_MARIONETES,
    },
    {
      id: "casa-marionetes-1-ano",
      title: "Marionetes",
      group: "1º ano – Professora Rosangela Homem",
      cast: [
        "Elisa Jasmin Liberati Guabette",
        "Elizabeth Borges Ruiz",
        "Isabela Trindade Chiconato",
        "Isis Ramazotte da Silva",
        "Lara Monteiro Martins",
        "Luiza Caetano Alves Seret Lion",
        "Maria Clara Roth Clausen",
        "Yasmin Mirella Forim",
      ],
    },
    {
      id: "casa-bonecas-escocesas",
      title: "Bonecas Escocesas",
      group: "1º ano – Professor Marciano Boletti",
      cast: [
        "Ana Laura Sobral da Silva",
        "Carolina Ayu Megumi Nakano Kataoka",
        "Cecília Broto Oliveira",
        "Eloisa de Souza Detoni",
        "Giullia Elisa Candido Valeez Pires",
        "Laura Stabile de Farias",
        "Liz Solcia Brazão",
        "Luiza de Brito",
        "Sara Lopes Martinelli",
      ],
    },
    {
      id: "casa-felicidade",
      title: "Solista da Felicidade",
      alternating: true,
      cast: CASA_FELICIDADE,
    },
    {
      id: "casa-soldadinho",
      title: "O Soldadinho e as Bailarinas",
      group: "1º ano – Professora Thayná Rodrigues",
      cast: [
        "Clara Rolandi Arruda",
        "Giovana Manuelly Pereira Barbosa",
        "Heitor Duarte Mendes",
        "Isadora Araujo de Souza",
        "Maria Alice Gomes de Sousa",
      ],
    },
  ],
  teachers:
    "Claudio de Souza, Eduarda Nishikawa, Marciano Boletti, Renata Doi, Rosangela Homem, Thacyane Vargas e Thayná Rodrigues",
};

const CASA_PRE: Opening = {
  id: "casa-de-brinquedos",
  title: "A Casa de Brinquedos",
  cohort: "Pré-ballet",
  synopsis: CASA_SYNOPSIS,
  characters: [
    { role: "Swanilda", name: "Fernanda Cereda Dale Vedove" },
    { role: "Doutor Coppelius", name: "Marciano Boletti" },
  ],
  dances: [
    {
      id: "casa-criancas",
      title: "As Crianças",
      group: "7º e 8º ano e Aperfeiçoamento – Professores Marciano Boletti e Renata Doi",
      cast: CASA_CRIANCAS,
    },
    {
      id: "casa-bonecas-chinesas",
      title: "Bonecas Chinesas",
      group: "Pré-ballet 3ª e 5ª noturno – Professora Thacyane Vargas",
      cast: [
        "Alice Costa do Carmo",
        "Alice Gotardo Lazzari",
        "Anabella Modena de Morais",
        "Erina Lopes Zolinger Zanin",
        "Lavínia Yumi Osug Couto",
        "Livia Carvalho Silva",
        "Lívia Moreira de Melo",
        "Liz Lozano Galetti",
        "Liz Modena de Morais",
        "Luna Catai Di Pietro",
        "Maria Helena Celerino do Amaral",
        "Maria Luiza Nakao",
        "Olivia Bersalini Ribero de Souza",
        "Teresa Duarte Alves",
        "Yara Akemi Miyamoto",
        "Ysadora Hemanuelly Cardoso Lima",
      ],
    },
    {
      id: "casa-bonecas-espanholas",
      title: "Bonecas Espanholas",
      group: "Pré-ballet 2ª e 4ª – Professora Thayná Rodrigues",
      soloist: "Carol Caramori Aparecido (Aperfeiçoamento)",
      cast: [
        "Cecilia Passone Martins",
        "Liz Orchel de Almeida",
        "Lorena Alves Sardi",
        "Luísa Martins Silva",
        "Maria Clara Valentin",
        "Valentina Santos de Souza",
        "Yasmin Vitoria Bueno da Silva",
      ],
    },
    {
      id: "casa-arlequin",
      title: "Arlequin",
      group: "Pré-ballet – Professor Edmeia Lima",
      cast: [
        "Aurora Caetano Rosa",
        "Elena Liz Truber Fagotti",
        "Helena Pagano Silva",
        "Isadora Nascimento Gobetti",
        "Lara Almendra Blume Nakayama",
        "Livia Yumi Nagamatsu Alicio",
        "Luanda Piaza Cerqueira",
        "Luna Farias Coelho Alves Guilherme",
        "Maria Beatriz Tamega Marzabal",
        "Maria Clara Tamega Marzabal",
        "Melissa Romano Manzini",
        "Olívia Biolada Cavalcante",
        "Sophia de Andrade Boberg",
      ],
    },
    {
      id: "casa-marionetes",
      title: "Marionetes",
      group: "5º e 6º ano – Professor Marciano Boletti",
      cast: CASA_MARIONETES,
    },
    {
      id: "casa-bonecas-escocesas",
      title: "Bonecas Escocesas",
      group: "Pré-ballet 3ª e 5ª – Professora Thayná Rodrigues",
      cast: [
        "Agnes Costa Rocha",
        "Angelina Giroto Delci",
        "Bella Sophia Padilha Stabile",
        "Eliza Boiani Souza",
        "Julia Polonha Santos",
        "Késia Emanueli Seret de França",
        "Manuella Valentina Souza",
      ],
    },
    {
      id: "casa-felicidade",
      title: "Solo da Felicidade",
      alternating: true,
      cast: CASA_FELICIDADE,
    },
    {
      id: "casa-bailarinas",
      title: "Bailarinas",
      group: "Pré-ballet matutino – Professora Thacyane Vargas",
      cast: [
        "Giovanna de Oliveira Moreira",
        "Isabela Martina Yoshinaga Bernardi",
        "Laura Rocha Pereira",
        "Maite Barcelos Sakai",
        "Maitê Mendonça Zana",
        "Manuela Marchleuski Tirapelle",
        "Maria Laura Capocci da Silva",
        "Maria Rafaella Ferreira Silva da Cruz",
        "Martina Lopes Ceribelli Colto",
        "Pietra Kluiber Lino",
      ],
    },
  ],
  teachers: "Edmeia Lima, Marciano Boletti, Renata Doi, Thacyane Vargas e Thayná Rodrigues",
};

/** Em 28 e 29 a Casa de Brinquedos (à tarde) vem antes do Coppélia (20h). */
export const SESSIONS: Session[] = [
  { id: "26", day: 26, kind: "coppelia", time: "20h", programId: "1" },
  { id: "27", day: 27, kind: "coppelia", time: "20h", programId: "2" },
  { id: "28-casa", day: 28, kind: "casa", time: "À tarde", opening: CASA_1_ANO },
  { id: "28", day: 28, kind: "coppelia", time: "20h", programId: "1" },
  { id: "29-casa", day: 29, kind: "casa", time: "À tarde", opening: CASA_PRE },
  { id: "29", day: 29, kind: "coppelia", time: "20h", programId: "2" },
];

/** Sessões em cartaz na data (horário de Brasília); vazio fora dos dias do espetáculo. */
export function sessionsForDate(date: Date): string[] {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return month === 11 ? SESSIONS.filter((x) => x.day === day).map((x) => x.id) : [];
}

export const ORIGINAL_WORK =
  "Baseado no Ballet Coppélia, um clássico que teve sua estreia em 25 de maio de 1870 no Théatre Impérial de L’Opera de Paris, com libreto de Charles Nuitter, música de Leo Delibes, coreografia de Arthur Saint-Léon e no papel principal a bailarina Giuseppina Bozzachi. A obra é baseada num conto do autor alemão Ernest Theodor Amadeus Wilhelm Hoffmann, um dos maiores da literatura mundial.";

export const CREDITS: { label: string; value: string }[] = [
  { label: "Direção", value: "Marciano Boletti" },
  { label: "Coordenação e Produção", value: "Luciana Lupi" },
  {
    label: "Professores",
    value:
      "Alessandra Menegazzo, Claudio de Souza, Eduarda Nishikawa, Luciana Lupi, Marciano Boletti, Renata Doi, Rosangela Homem, Thacyane Vargas e Thayná Rodrigues",
  },
  { label: "Figurinos (execução)", value: "Luroka Confecções" },
  { label: "Adereços e Coroas", value: "Luciana Lupi" },
  { label: "Operador de áudio", value: "Claudio de Souza" },
  { label: "Iluminação", value: "Luiz Eduardo Pires" },
  { label: "Designer Gráfico", value: "Agência Pratic" },
  { label: "Designer Gráfico / Cenário", value: "Luis Adriano Pilchowski" },
  { label: "Assessoria de redes sociais", value: "Agência Pratic" },
  { label: "Fotografia", value: "Fabio Alcover" },
  { label: "Videomaker", value: "Arthur Ribeiro" },
  { label: "Coordenação da Escola Municipal de Dança", value: "Luciana Lupi" },
];

export const GRADUATES = [
  "Beatriz Brito da Silva",
  "Fernanda Cereda Dale Vedove",
  "Gabriela Teixeira Ernegas",
  "Jasão Padilha",
  "Lorena Brito Macedo",
  "Maria Eduarda de Souza Bino",
  "Maria Luiza Rodrigues Ivasita",
];

/** O programa pede o logo da UEL menor que os outros dois (`minor`). */
export const SUPPORTERS: { role: string; name: string; detail?: string; minor?: boolean; logo?: string }[] = [
  {
    role: "Realização",
    name: "FUNCART — Fundação Cultura Artística de Londrina",
    logo: "/funcart/coppelia/logos/funcart.svg",
  },
  {
    role: "Patrocínio",
    name: "Prefeitura de Londrina",
    detail: "Secretaria Municipal de Cultura",
    logo: "/funcart/coppelia/logos/prefeitura-londrina.png",
  },
  {
    role: "Apoio",
    name: "Universidade Estadual de Londrina",
    detail: "Casa de Cultura da UEL",
    minor: true,
    logo: "/funcart/coppelia/logos/uel.webp",
  },
];

export interface Phone {
  display: string;
  tel: string;
  whatsapp?: boolean;
}

export const FUNCART_UNITS: { name: string; address: string[]; phones: Phone[] }[] = [
  {
    name: "Sede",
    address: ["Rua Senador Souza Naves, 2.380", "Jardim Londrilar"],
    phones: [
      { display: "(43) 99683-0002", tel: "+5543996830002", whatsapp: true },
      { display: "(43) 3342-2362", tel: "+554333422362" },
    ],
  },
  {
    name: "Unidade Norte",
    address: ["Avenida Alexandre Santoro, 440", "Jardim São Paulo"],
    phones: [{ display: "(43) 99198-8878", tel: "+5543991988878", whatsapp: true }],
  },
];

export const INSTAGRAM = { handle: "@funcartlondrina", url: "https://instagram.com/funcartlondrina" };
