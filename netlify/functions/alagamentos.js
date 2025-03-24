// Scraper para dados de alagamentos de São Paulo
// Para ser usado com GitHub Pages
// Necessário hospedar essa função em um serviço serverless como Netlify Functions ou Vercel Serverless Functions

// Função principal para o ambiente serverless (Netlify Functions, Vercel, etc.)
exports.handler = async function(event, context) {
  try {
    const alagamentosData = await scrapAlagamentosData();
    
    // Habilita CORS para permitir acesso do GitHub Pages
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // Permita acesso de qualquer origem
        "Content-Type": "application/json"
      },
      body: JSON.stringify(alagamentosData)
    };
  } catch (error) {
    console.error("Erro ao fazer scraping:", error);
    
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: "Falha ao obter dados de alagamentos" })
    };
  }
};

// Função principal de scraping
async function scrapAlagamentosData() {
  const fetch = require('node-fetch');
  const cheerio = require('cheerio');
  
  // URLs do CGE
  const cgeUrl = 'https://www.cgesp.org/v3/alagamentos.jsp';
  
  // Fazer a requisição para o site do CGE
  console.log("Buscando dados do CGE...");
  const response = await fetch(cgeUrl);
  const html = await response.text();
  
  // Carregar o HTML com cheerio
  const $ = cheerio.load(html);
  
  // Dados de retorno organizados por região
  const regioes = {
    "ZONA NORTE": { regiao: "ZONA NORTE", pontos: 0, pontos_detalhes: [] },
    "ZONA SUL": { regiao: "ZONA SUL", pontos: 0, pontos_detalhes: [] },
    "ZONA LESTE": { regiao: "ZONA LESTE", pontos: 0, pontos_detalhes: [] },
    "ZONA OESTE": { regiao: "ZONA OESTE", pontos: 0, pontos_detalhes: [] },
    "CENTRO": { regiao: "CENTRO", pontos: 0, pontos_detalhes: [] }
  };
  
  // Extrair os pontos de alagamento
  const alagamentosTable = $('#alag');
  
  // Verificar se existem alagamentos ativos
  if ($('#alag').find('tr').length <= 1) {
    console.log("Nenhum alagamento ativo encontrado.");
    return Object.values(regioes);
  }
  
  // Processar cada linha da tabela (pulando o cabeçalho)
  $('#alag tr').each((index, element) => {
    // Pular o cabeçalho
    if (index === 0) return;
    
    const colunas = $(element).find('td');
    if (colunas.length >= 5) {
      // Extrair dados de cada coluna
      const infoCompleta = $(colunas[0]).text().trim();
      const inicio = $(colunas[1]).text().trim();
      const situacao = $(colunas[2]).text().trim();
      
      // Extrair região e endereço
      const regiaoMatch = infoCompleta.match(/(ZONA NORTE|ZONA SUL|ZONA LESTE|ZONA OESTE|CENTRO)/i);
      let regiao = regiaoMatch ? regiaoMatch[0].toUpperCase() : "OUTROS";
      
      // Remover a região do texto para ficar só com o endereço
      let endereco = infoCompleta.replace(regiao, '').trim();
      endereco = endereco.replace(/^[-:,\s]+/, '').trim(); // Limpar caracteres iniciais
      
      // Extrair bairro (geralmente entre parênteses)
      let bairro = "";
      const bairroMatch = endereco.match(/\(([^)]+)\)/);
      if (bairroMatch && bairroMatch[1]) {
        bairro = bairroMatch[1].trim();
        endereco = endereco.replace(/\([^)]+\)/, '').trim(); // Remover bairro do endereço
      }
      
      // Determinar o nível de água com base na situação
      let nivel = "baixo";
      if (situacao.toLowerCase().includes("alto") || situacao.toLowerCase().includes("transbordando")) {
        nivel = "alto";
      } else if (situacao.toLowerCase().includes("intransitável") || situacao.toLowerCase().includes("intransponível")) {
        nivel = "intransitavel";
      } else if (situacao.toLowerCase().includes("médio") || situacao.toLowerCase().includes("moderado")) {
        nivel = "medio";
      }
      
      // Extrair informações sobre transportes, se disponíveis (coluna adicional)
      let transportes = "Sem informações sobre transportes";
      if (colunas.length >= 6) {
        const transInfo = $(colunas[5]).text().trim();
        if (transInfo && transInfo !== "-") {
          transportes = transInfo;
        }
      }
      
      // Calcular duração estimada com base em alguma lógica (ex: nível de água)
      // Isso é uma estimativa, já que o CGE não fornece essa informação diretamente
      let duracao = 30; // valor padrão
      if (nivel === "medio") duracao = 60;
      if (nivel === "alto") duracao = 75;
      if (nivel === "intransitavel") duracao = 90;
      
      // Adicionar aos dados da região correspondente
      if (regioes[regiao]) {
        regioes[regiao].pontos++;
        regioes[regiao].pontos_detalhes.push({
          endereco: endereco,
          bairro: bairro || "N/A",
          inicio: inicio,
          nivel: nivel,
          duracao: duracao,
          transportes: transportes
        });
      }
    }
  });
  
  console.log(`Processados ${Object.values(regioes).reduce((total, r) => total + r.pontos, 0)} pontos de alagamento.`);
  
  // Retornar como array de objetos
  return Object.values(regioes);
}

// Para testes locais (descomente para testar)
/*
if (require.main === module) {
  scrapAlagamentosData()
    .then(data => console.log(JSON.stringify(data, null, 2)))
    .catch(err => console.error('Erro:', err));
}
*/