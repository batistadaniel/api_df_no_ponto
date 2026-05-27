import express from 'express';
import cors from 'cors';
import { performance } from "perf_hooks";

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 3000;

/* 
Esta rota retorna algumas informacoes sobre os detalhes do sistema DF No Ponto.
*/
app.get('/detalhes-do-projeto', async (req, res) => {
  const inicio = performance.now();

  try {
    const endpoints = {
      projeto_hash: 'https://mobilibus.com/api/project-details?project_hash=3c189',
      projeto_id: 'https://mobilibus.com/api/project-details?project_id=313'
    };

    const [respostaHash, respostaId] = await Promise.all([
      fetch(endpoints.projeto_hash),
      fetch(endpoints.projeto_id)
    ]);

    const dadosHash = await respostaHash.json();
    const dadosId = await respostaId.json();

    const fim = (performance.now() - inicio).toFixed(2);

    res.json({
      tempo_execucao: `${fim}ms`,
      operadoras: dadosHash.agencies.map(operadoraHash => {
        const operadoraNumerica = dadosId.agencies.find(
          operadoraId => operadoraId.name === operadoraHash.name
        );
        return {
          id_operadora_hash: operadoraHash.agencyId,
          id_operadora: operadoraNumerica?.agencyId,
          nome_operadora: operadoraHash.name
        };
      }),
      frequencia_tempo_real_segundos: 20,
      offset_partidas_tempo_real_segundos: 10,
      planejador_de_viagens: dadosHash.otpUri,
      appId: dadosHash.appId,
      projectId: dadosHash.projectId,
    });
  } catch (error) {
    console.error('Erro ao buscar dados da API:', error);
    res.status(500).json({error: 'Erro ao buscar dados da API'});
  }
});

/* 
Esta rota retorna informacoes sobre as operadoras do sistema DF No Ponto.
*/
app.get('/operadoras', async (req, res) => {
  const inicio = performance.now();

  try {
    const endpoints = [
      'https://mobilibus.com/api/agencies?origin=web&project_hash=3c189',
      'https://mobilibus.com/api/agencies?origin=web&project_id=313',
    ];

    const [dadosHash, dadosId] = await Promise.all(
      endpoints.map(url =>
        fetch(url).then(res => res.json())
      )
    );

    const fim = (performance.now() - inicio).toFixed(2);

    res.json({
      tempo_execucao: `${fim}ms`,
      operadoras: dadosHash.map(operadoraHash => {
        const operadoraNumerica = dadosId.find(
          operadoraId => operadoraId.name === operadoraHash.name
        );
        return {
          id_operadora_hash: operadoraHash.agencyId,
          id_operadora: operadoraNumerica?.agencyId,
          nome_operadora: operadoraHash.name
        };
      })
    });
  } catch (error) {
    console.error('Erro ao buscar dados da API:', error);
    res.status(500).json({error: 'Erro ao buscar dados da API'});
  }  
});

/* 
Esta rota retorna informacoes sobre as linhas do sistema DF No Ponto.
*/
app.get('/linhas', async (req, res) => {
  const inicio = performance.now();

  try {
    const endpoints = [
      'https://mobilibus.com/api/routes?origin=web&project_hash=3c189',
      'https://mobilibus.com/api/routes?origin=web&project_id=313',
      'https://otp.mobilibus.com/FY7J-lwk85QGbn/otp/routers/default/index/routes'
    ];

    const [dadosHash, dadosId, dadosOtp] = await Promise.all(
      endpoints.map(url =>
        fetch(url).then(res => res.json())
      )
    );

    const fim = (performance.now() - inicio).toFixed(2);

    res.json({
      tempo_execucao: `${fim}ms`,
      qtd_linhas: dadosHash.length,
      linhas: dadosHash.map(linhaHash => {
        const linhaNumerica = dadosId.find(
          linhaId =>
            linhaId.shortName === linhaHash.shortName &&
            linhaId.longName === linhaHash.longName
        );
        const linhaOtp = dadosOtp.find(
          otp =>
            otp.shortName === linhaHash.shortName &&
            otp.longName === linhaHash.longName
        );
        return {
          id_linha_hash: linhaHash.routeId,
          id_linha: linhaNumerica?.routeId,
          id_operadora_hash: linhaHash.agencyId,
          id_operadora: linhaNumerica?.agencyId,
          operadora: linhaOtp?.agencyName,
          codigo_linha: linhaHash.shortName,
          nome_linha: linhaHash.longName,
          tarifa: linhaHash.price,
          tipo: linhaHash.type,
          cor: linhaHash.color,
          cor_texto: linhaHash.textColor
        };
      })
    });
  } catch (error) {
    console.error('Erro ao buscar dados da API:', error);
    res.status(500).json({error: 'Erro ao buscar dados da API'});
  }
});


/* 
Esta rota retorna detalhes (horaios, sentidos) sobre uma linha do sistema DF No Ponto.
*/
app.get('/linhas/:numero', async (req, res) => {
  const inicio = performance.now();
  const numeroBusca = req.params.numero?.toLowerCase().trim();

  try {
    const resposta = await fetch(`http://localhost:${PORT}/linhas`);
    const dadosLinhas = await resposta.json();

    let linha = dadosLinhas.linhas.find(l => l.codigo_linha?.toLowerCase() === numeroBusca || l.nome_linha?.toLowerCase() === numeroBusca);
    if (numeroBusca === "ceilandia") linha = dadosLinhas.linhas.find(l => l.nome_linha?.toLowerCase() === "ceilândia");

    if (!linha) {
      let match = null;

      if (numeroBusca.includes(".")) {
        const [p1, p2] = numeroBusca.split(".");
        match = dadosLinhas.linhas.find(l => l.codigo_linha === `${p1.padStart(4 - p2.length, "0")}.${p2}`);
      }

      if (!match) {
        const buscaLimpa = numeroBusca.replace(/\./g, "").padStart(4, "0");
        match = dadosLinhas.linhas.find(l => (l.codigo_linha || "").replace(/\./g, "").padStart(4, "0") === buscaLimpa);
      }

      if (match?.codigo_linha) return res.redirect(`/linhas/${match.codigo_linha}`);
      return res.status(404).json({ error: 'Linha não encontrada no sistema oficial.' });
    }

    const [respostaHash, respostaId] = await Promise.all([
      fetch(`https://mobilibus.com/api/timetable?origin=web&v=2&project_hash=3c189&route_hash=${linha.id_linha_hash}`),
      fetch(`https://mobilibus.com/api/timetable?origin=web&v=2&project_id=313&route_id=${linha.id_linha}`)
    ]);

    const dadosHash = await respostaHash.json();
    const dadosId = await respostaId.json();

    res.json({
      tempo_execucao: `${(performance.now() - inicio).toFixed(2)}ms`,
      linha: {
        id_linha_hash: dadosHash.routeId,
        id_linha: dadosId.routeId,
        codigo_linha: dadosHash.shortName,
        nome_linha: dadosHash.longName,
        cor_operadora: dadosHash.color,
        tarifa: dadosHash.price
      },
      viagens: (dadosHash.timetable?.trips || []).map((t, i) => ({
        id_viagem_hash: t.tripId,
        id_viagem: dadosId.timetable?.trips?.[i]?.tripId,
        sentido: t.directionId,
        descricao: t.tripDesc
      })),
      sentidos: (dadosHash.timetable?.directions || []).map((d, i) => ({
        id_sentido_hash: d.directionId,
        id_sentido: dadosId.timetable?.directions?.[i]?.directionId,
        destino: d.desc,
        servicos: (d.services || []).map((s, si) => ({
          id_servico_hash: s.serviceId,
          id_servico: dadosId.timetable?.directions?.[i]?.services?.[si]?.serviceId,
          descricao: s.desc,
          partidas: (s.departures || []).map(p => ({ partida: p.dep, chegada: p.arr }))
        }))
      }))
    });

  } catch (error) {
    console.error('Erro na rota /linhas:', error.message);
    res.status(500).json({ error: 'Erro ao buscar dados da API', detalhe: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});