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
const formatarDelay = (segundos) => {
  const abs = Math.abs(segundos);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

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
      return res.status(404).json({ error: 'Linha não encontrada no systema oficial.' });
    }

    const [respostaHash, respostaId, respostaOperadoras] = await Promise.all([
      fetch(`https://mobilibus.com/api/timetable?origin=web&v=2&project_hash=3c189&route_hash=${linha.id_linha_hash}`),
      fetch(`https://mobilibus.com/api/timetable?origin=web&v=2&project_id=313&route_id=${linha.id_linha}`),
      fetch('https://otp.mobilibus.com/FY7J-lwk85QGbn/otp/routers/default/index/routes') 
    ]);

    const dadosHash = await respostaHash.json();
    const dadosId = await respostaId.json();
    const listaOperadoras = await respostaOperadoras.json();

    const idLinhaString = String(dadosId.routeId);
    const dadosOperadora = listaOperadoras.find(route => 
      route.id === `1:${idLinhaString}` || 
      route.id?.endsWith(`:${idLinhaString}`) || 
      route.shortName === dadosHash.shortName
    );

    const tripsRaw = dadosHash.timetable?.trips || [];

    const promessasItinerarios = tripsRaw.map(async (t, i) => {
      const idViagemHash = t.tripId;
      const idViagem = dadosId.timetable?.trips?.[i]?.tripId;

      try {
        const [resDetalhesHash, resDetalhesId, resVeiculos] = await Promise.all([
          idViagemHash ? fetch(`https://mobilibus.com/api/trip-details?origin=web&v=2&trip_hash=${idViagemHash}`) : null,
          idViagem ? fetch(`https://mobilibus.com/api/trip-details?origin=web&v=2&trip_id=${idViagem}`) : null,
          idViagem && dadosId.routeId ? fetch(`https://mobilibus.com/api/vehicles?origin=web&trip_id=${idViagem}&route_id=${dadosId.routeId}`) : null
        ]);

        const dadosDetalhesHash = resDetalhesHash ? await resDetalhesHash.json() : null;
        const dadosDetalhesId = resDetalhesId ? await resDetalhesId.json() : null;
        const dadosVeiculos = resVeiculos ? await resVeiculos.json() : [];

        const stopsHash = dadosDetalhesHash?.stops || [];
        const stopsId = dadosDetalhesId?.stops || [];

        const paradas = stopsHash.map((stopH, sIndex) => {
          const stopIdNormal = stopsId[sIndex];
          
          return {
            id_parada_hash: stopH.stopId,
            id_parada: stopIdNormal ? stopIdNormal.stopId : null,
            nome: stopH.name,
            latitude: stopH.lat,
            longitude: stopH.lng,
            tempo: stopH.int,
            parada: sIndex + 1
          };
        });

        const veiculos = (Array.isArray(dadosVeiculos) ? dadosVeiculos : []).map(vehicle => ({
          prefixo: vehicle.vehicleId,
          ultimo_sinal: vehicle.positionTime,
          latitude: vehicle.lat,
          longitude: vehicle.lng,
          progresso: vehicle.percTravelled,
          angulo: vehicle.heading,
          horario_partida: vehicle.startTime,
          delay: vehicle.delay,
          parada_atual: vehicle.seq,
          status: Math.abs(vehicle.delay) <= 60 ? "No horário" : (vehicle.delay > 0 ? "Atrasado" : "Adiantado"),
          delay_formatado: formatarDelay(vehicle.delay)
        }));

        return {
          id_viagem_hash: idViagemHash,
          id_viagem: idViagem,
          sentido: t.directionId === 0 ? "Ida" : "Volta",
          directionId: t.directionId,
          descricao: t.tripDesc,
          qtd_paradas: paradas.length,
          qtd_veiculos_rodando: veiculos.length,
          veiculos_rodando: veiculos,
          itinerario: paradas
        };
      } catch (err) {
        console.error(`Erro ao buscar itinerário duplo da viagem ${idViagemHash}:`, err.message);
        return {
          id_viagem_hash: idViagemHash,
          id_viagem: idViagem,
          sentido: t.directionId,
          descricao: t.tripDesc,
          qtd_paradas: 0,
          qtd_veiculos_rodando: 0,
          veiculos_rodando: [],
          itinerario: []
        };
      }
    });

    const viagensComItinerario = await Promise.all(promessasItinerarios);

    res.json({
      tempo_execucao: `${(performance.now() - inicio).toFixed(2)}ms`,
      qtd_sentidos: dadosHash.timetable?.directions.length,
      linha: {
        id_linha_hash: dadosHash.routeId,
        id_linha: dadosId.routeId,
        codigo_linha: dadosHash.shortName,
        nome_linha: dadosHash.longName,
        cor_operadora: dadosHash.color,
        operadora: dadosOperadora ? dadosOperadora.agencyName : "Não encontrada", 
        tarifa: dadosHash.price
      },
      viagens: viagensComItinerario.sort((a, b) => a.directionId - b.directionId),
      sentidos: (dadosHash.timetable?.directions || [])
        .sort((a, b) => a.directionId - b.directionId)  
        .map((d, i) => ({
          id_sentido_hash: d.directionId,
          id_sentido: dadosId.timetable?.directions?.[i]?.directionId,
          destino: d.desc,
          servicos: (d.services || []).map((s, si) => ({
            id_servico_hash: s.serviceId,
            id_servico: dadosId.timetable?.directions?.[i]?.services?.[si]?.serviceId,
            descricao: s.desc,
            qtd_partidas: s.departures.length,
            partidas: (s.departures || []).map(p => ({ partida: p.dep, chegada: p.arr }))
          }))
        }))
    });

  } catch (error) {
    console.error('Erro na rota /linhas:', error.message);
    res.status(500).json({ error: 'Erro ao buscar dados da API', detalhe: error.message });
  }
});

/* 
Esta rota retorna detalhes sobre alertas do sistema DF No Ponto.
*/
app.get('/alertas', async (req, res) => {
  const inicio = performance.now();

  const formatarData = (timestamp, timezoneOffset = 0) => {
    const data = new Date(timestamp);

    return data.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  try {

    const endpoints = {
      alertas_hash: 'https://mobilibus.com/api/alerts?project_hash=3c189',
      alertas_id: 'https://mobilibus.com/api/alerts?project_id=313',
      linhas_hash: 'https://mobilibus.com/api/routes?origin=web&project_hash=3c189',
      linhas_id: 'https://mobilibus.com/api/routes?origin=web&project_id=313',
      operadoras_hash: 'https://mobilibus.com/api/agencies?origin=web&project_hash=3c189',
      operadoras_id: 'https://mobilibus.com/api/agencies?origin=web&project_id=313'
    };

    const [
      respostaAlertasHash,
      respostaAlertasId,
      respostaLinhasHash,
      respostaLinhasId,
      respostaOperadorasHash,
      respostaOperadorasId
    ] = await Promise.all([
      fetch(endpoints.alertas_hash),
      fetch(endpoints.alertas_id),
      fetch(endpoints.linhas_hash),
      fetch(endpoints.linhas_id),
      fetch(endpoints.operadoras_hash),
      fetch(endpoints.operadoras_id)
    ]);

    const dadosAlertasHash = await respostaAlertasHash.json();
    const dadosAlertasId = await respostaAlertasId.json();
    const dadosLinhasHash = await respostaLinhasHash.json();
    const dadosLinhasId = await respostaLinhasId.json();
    const dadosOperadorasHash = await respostaOperadorasHash.json();
    const dadosOperadorasId = await respostaOperadorasId.json();

    const fim = (performance.now() - inicio).toFixed(2);

    res.json({
      tempo_execucao: `${fim}ms`,
      alertas: dadosAlertasHash.map((alertaHash, index) => {
        const alertaNumerico = dadosAlertasId[index];
        const operadorasAfetadas =
          alertaHash.affectedEntities.agencyIds.map(
            agencyIdHash => {

              const operadoraHash =
                dadosOperadorasHash.find(
                  operadora =>
                    operadora.agencyId === agencyIdHash
                );

              const operadoraNumerica =
                dadosOperadorasId.find(
                  operadora =>
                    operadora.name === operadoraHash?.name
                );

              return {
                id_operadora_hash: operadoraHash?.agencyId,
                id_operadora: operadoraNumerica?.agencyId,
                nome_operadora: operadoraHash?.name
              };
            }
          );

        const linhasAfetadas =
          alertaHash.affectedEntities.routeIds.map(
            routeIdHash => {
              const linhaHash =
                dadosLinhasHash.find(
                  linha =>
                    linha.routeId === routeIdHash
                );
              const linhaNumerica =
                dadosLinhasId.find(
                  linha =>
                    linha.shortName === linhaHash?.shortName &&
                    linha.longName === linhaHash?.longName
                );
              return {
                id_linha_hash: linhaHash?.routeId,
                id_linha: linhaNumerica?.routeId,
                codigo_linha: linhaHash?.shortName,
                nome_linha: linhaHash?.longName
              };
            }
          );

        return {
          id_alerta_hash: alertaHash.alertId,
          id_alerta: alertaNumerico?.alertId,
          inicio_alerta: formatarData(alertaHash.activeFrom),
          fim_alerta: formatarData(alertaHash.activeTo),
          causa: alertaHash.cause,
          efeito: alertaHash.effect,
          titulo: alertaHash.content?.PT?.[1],
          descricao: alertaHash.content?.PT?.[2],
          operadoras_afetadas: operadorasAfetadas,
          linhas_afetadas: linhasAfetadas
        };
      })
    });

  } catch (error) {
    console.error('Erro na rota /alertas:', error.message
    );
    res.status(500).json({ error: 'Erro ao buscar dados da API', detalhe: error.message });
  }
});


// usar depois
app.get('/noticias', async (req, res) => {
  const inicio = performance.now();

  try {
    
    res.json({ });
  } catch (error) {
    console.error('Erro na rota /noticias:', error.message);
    res.status(500).json({ error: 'Erro ao buscar dados da API', detalhe: error.message });
  }
});



app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});