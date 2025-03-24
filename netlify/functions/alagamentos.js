// Arquivo: netlify/functions/alagamentos.js

const axios = require('axios');
const cheerio = require('cheerio');
const { Telegraf } = require('telegraf');

// Configuração do bot do Telegram
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// URL base do CGE
const CGE_URL = 'https://www.cgesp.org/v3/alagamentos.jsp';

// Cache para armazenar o último estado conhecido
let ultimoEstado = {};

// Database URL para armazenar inscritos - em produção use um banco de dados real
const SUBSCRIBERS_API = process.env.SUBSCRIBERS_API;

exports.handler = async function(event, context) {
  // Permitir CORS para o GitHub Pages
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Para requisições via bot do Telegram
  if (event.body && event.headers['x-telegram-bot-api-secret-token'] === process.env.TELEGRAM_WEBHOOK_SECRET) {
    try {
      const update = JSON.parse(event.body);
      await handleTelegramUpdate(update);
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true })
      };
    } catch (error) {
      console.error('Erro ao processar atualização do Telegram:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Erro no processamento do webhook do Telegram' })
      };
    }
  }

  // Para requisições da API web
  try {
    const alagamentosData = await obterDadosAlagamentos();
    
    // Verificar por novas regiões com 2 pontos
    const regioesDoisPontos = alagamentosData.filter(item => item.pontos === 2);
    const novasRegioesDoisPontos = regioesDoisPontos.filter(
      item => !ultimoEstado[item.regiao] || ultimoEstado[item.regiao] !== 2
    );
    
    // Atualizar o último estado conhecido
    alagamentosData.forEach(item => {
      ultimoEstado[item.regiao] = item.pontos;
    });
    
    // Se houver novas regiões com 2 pontos, notificar assinantes
    if (novasRegioesDoisPontos.length > 0) {
      await notificarAssinantes(novasRegioesDoisPontos);
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(alagamentosData)
    };
  } catch (error) {
    console.error('Erro ao obter dados de alagamentos:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro ao obter dados de alagamentos' })
    };
  }
};

// Função para obter dados de alagamentos do CGE
async function obterDadosAlagamentos() {
  try {
    // Gerar data atual no formato necessário
    const hoje = new Date();
    const dataFormatada = `${hoje.getDate().toString().padStart(2, '0')}%2F${(hoje.getMonth() + 1).toString().padStart(2, '0')}%2F${hoje.getFullYear()}`;
    
    const url = `${CGE_URL}?dataBusca=${dataFormatada}&enviaBusca=Buscar`;
    const response = await axios.get(url);
    
    // Usar Cheerio para fazer scraping do HTML
    const $ = cheerio.load(response.data);
    const alagamentos = [];
    
    // Procurar por todas as tabelas na página
    $('table').each((i, tabela) => {
      $(tabela).find('tr').each((j, linha) => {
        const colunas = $(linha).find('td');
        if (colunas.length >= 2) {
          const regiao = $(colunas[0]).text().trim();
          const pontosTexto = $(colunas[1]).text().trim();
          
          // Tentar converter para número
          try {
            const pontos = parseInt(pontosTexto);
            if (!isNaN(pontos)) {
              alagamentos.push({ regiao, pontos });
            }
          } catch (e) {
            // Ignorar se não for possível converter
          }
        }
      });
    });
    
    return alagamentos;
  } catch (error) {
    console.error('Erro ao buscar dados do CGE:', error);
    throw error;
  }
}

// Função para manipular atualizações do Telegram
async function handleTelegramUpdate(update) {
  // Verificar se é uma mensagem
  if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;
    
    // Comandos do bot
    if (text === '/start' || text === '/ajuda') {
      await bot.telegram.sendMessage(chatId, 
        'Bem-vindo ao Bot de Monitoramento de Alagamentos SP! 📢\n\n' +
        'Comandos disponíveis:\n' +
        '/assinar - Receba alertas sobre regiões com 2 pontos de alagamento\n' +
        '/cancelar - Cancelar inscrição nos alertas\n' +
        '/status - Ver o status atual dos alagamentos\n' +
        '/ajuda - Ver esta mensagem de ajuda'
      );
    } 
    else if (text === '/assinar') {
      await adicionarAssinante(chatId);
      await bot.telegram.sendMessage(chatId, 
        '✅ Você agora está inscrito para receber alertas quando alguma região atingir 2 pontos de alagamento.\n\n' +
        'Você receberá notificações automáticas. Para cancelar, envie /cancelar.'
      );
    }
    else if (text === '/cancelar') {
      await removerAssinante(chatId);
      await bot.telegram.sendMessage(chatId, 
        '❌ Sua inscrição foi cancelada. Você não receberá mais alertas de alagamentos.\n\n' +
        'Para se inscrever novamente, envie /assinar.'
      );
    }
    else if (text === '/status') {
      try {
        const alagamentosData = await obterDadosAlagamentos();
        
        if (alagamentosData.length === 0) {
          await bot.telegram.sendMessage(chatId, 'Não há dados de alagamentos disponíveis no momento.');
          return;
        }
        
        // Ordenar por número de pontos (decrescente)
        alagamentosData.sort((a, b) => b.pontos - a.pontos);
        
        let mensagem = '🌧️ *Status atual de alagamentos* 🌧️\n\n';
        
        alagamentosData.forEach(item => {
          let emoji;
          if (item.pontos === 0) emoji = '✅';
          else if (item.pontos === 1) emoji = '⚠️';
          else if (item.pontos === 2) emoji = '🚨';
          else emoji = '❌';
          
          mensagem += `${emoji} *${item.regiao}*: ${item.pontos} ponto(s)\n`;
        });
        
        mensagem += `\nÚltima atualização: ${new Date().toLocaleString('pt-BR')}`;
        
        await bot.telegram.sendMessage(chatId, mensagem, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error('Erro ao buscar status de alagamentos:', error);
        await bot.telegram.sendMessage(chatId, 'Desculpe, ocorreu um erro ao buscar os dados de alagamentos.');
      }
    }
    else {
      await bot.telegram.sendMessage(chatId, 
        'Comando não reconhecido. Envie /ajuda para ver a lista de comandos disponíveis.'
      );
    }
  }
}

// Função para adicionar assinante
async function adicionarAssinante(chatId) {
  try {
    // Em produção, você usaria um banco de dados real
    // Esta é uma implementação simplificada
    const response = await axios.get(`${SUBSCRIBERS_API}`);
    const subscribers = response.data || [];
    
    if (!subscribers.includes(chatId)) {
      subscribers.push(chatId);
      await axios.put(`${SUBSCRIBERS_API}`, subscribers);
    }
  } catch (error) {
    console.error('Erro ao adicionar assinante:', error);
    throw error;
  }
}

// Função para remover assinante
async function removerAssinante(chatId) {
  try {
    const response = await axios.get(`${SUBSCRIBERS_API}`);
    let subscribers = response.data || [];
    
    subscribers = subscribers.filter(id => id !== chatId);
    await axios.put(`${SUBSCRIBERS_API}`, subscribers);
  } catch (error) {
    console.error('Erro ao remover assinante:', error);
    throw error;
  }
}

// Função para notificar todos os assinantes
async function notificarAssinantes(regioesDoisPontos) {
  try {
    // Obter lista de assinantes
    const response = await axios.get(`${SUBSCRIBERS_API}`);
    const subscribers = response.data || [];
    
    if (subscribers.length === 0) {
      console.log('Nenhum assinante para notificar');
      return;
    }
    
    // Formatar mensagem
    let mensagem = '🚨 *ALERTA DE ALAGAMENTO* 🚨\n\n';
    mensagem += '*Regiões com 2 pontos de alagamento:*\n\n';
    
    regioesDoisPontos.forEach(item => {
      mensagem += `• ${item.regiao}\n`;
    });
    
    mensagem += `\nData e hora: ${new Date().toLocaleString('pt-BR')}`;
    
    // Enviar notificação para cada assinante
    const promises = subscribers.map(chatId => 
      bot.telegram.sendMessage(chatId, mensagem, { parse_mode: 'Markdown' })
    );
    
    await Promise.all(promises);
    console.log(`Notificações enviadas para ${subscribers.length} assinantes`);
  } catch (error) {
    console.error('Erro ao notificar assinantes:', error);
    throw error;
  }
}
