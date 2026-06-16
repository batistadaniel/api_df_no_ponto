import express from 'express';
import cors from 'cors';
import { performance } from "perf_hooks";

const app = express();

app.use(cors());
app.use(express.json());

// const PORT = 3000;

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

app.get('/linhas/:id', async (req, res) => {
  const inicio = performance.now();
  const { id } = req.params;

  try {
    const [resTimetable, resRoute, resPatterns] = await Promise.all([
      fetch(`https://mobilibus.com/api/timetable?origin=web&v=2&project_id=313&route_id=${id}`),
      fetch(`https://otp.mobilibus.com/FY7J-lwk85QGbn/otp/routers/default/index/routes/1:${id}`),
      fetch(`https://otp.mobilibus.com/FY7J-lwk85QGbn/otp/routers/default/index/routes/1:${id}/patterns`)
    ]);

    if (!resTimetable.ok) {
      return res.status(404).json({ error: 'Linha não encontrada' });
    }

    const timetable = await resTimetable.json();
    const route = resRoute.ok ? await resRoute.json() : {};
    const patterns = resPatterns.ok ? await resPatterns.json() : [];

    const sentidos = patterns.map(pattern => {
      const partes = pattern.id.split(':');

      return {
        id_pattern: pattern.id,
        sentido: Number(partes[2]),
        destino: pattern.desc
          .replace(`${pattern.route?.shortName} to `, '')
          .replace(/\s+\(.*?\)$/, '')
      };
    });

    return res.json({
      tempo_execucao: `${(performance.now() - inicio).toFixed(2)}ms`,

      linha: {
        id: timetable.routeId,
        codigo: timetable.shortName,
        nome: timetable.longName,
        descricao: timetable.desc || null,
        tipo: timetable.type,
        tarifa: timetable.price,
        ar_condicionado: timetable.ac,
        cor: timetable.color,
        cor_texto: timetable.textColor
      },

      operadora: route.agency ? {
        id_otp: route.agency.id,
        nome: route.agency.name,
        telefone: route.agency.phone,
        idioma: route.agency.lang,
        timezone: route.agency.timezone,
        site: route.agency.url,
        tarifa_url: route.agency.fareUrl
      } : null,

      estatisticas: {
        qtd_sentidos: sentidos.length,
        qtd_servicos: timetable.timetable?.directions?.reduce(
          (total, dir) => total + (dir.services?.length || 0),
          0
        ) || 0
      },

      sentidos
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Erro ao consultar linha',
      detalhe: error.message
    });
  }
});

/*
Esta rota retorna apenas a tabela horaria de um linha especifica
*/
app.get('/linhas/:id/horarios', async (req, res) => {
  const inicio = performance.now();
  const { id } = req.params;

  try {
    const resposta = await fetch(
      `https://mobilibus.com/api/timetable?v=2&route_id=${id}`
    );

    if (!resposta.ok) {
      return res.status(404).json({
        error: 'Linha não encontrada'
      });
    }

    const dados = await resposta.json();

    const destinosPorSentido = {};

    (dados.timetable?.trips || []).forEach(trip => {
      destinosPorSentido[trip.directionId] = trip.tripDesc;
    });

    return res.json({
      tempo_execucao: `${(performance.now() - inicio).toFixed(2)}ms`,

      linha: {
        id: dados.routeId,
        codigo: dados.shortName,
        nome: dados.longName,
        tarifa: dados.price,
        cor: dados.color,
        cor_texto: dados.textColor,
        ar_condicionado: dados.ac
      },

      estatisticas: {
        qtd_sentidos: dados.timetable?.directions?.length || 0,
        qtd_servicos:
          dados.timetable?.directions?.reduce(
            (total, dir) => total + (dir.services?.length || 0),
            0
          ) || 0
      },

      viagens: (dados.timetable?.trips || []).map(trip => ({
        id_viagem: trip.tripId,
        descricao: trip.tripDesc,
        nome_curto: trip.shortName || null,
        sentido: trip.directionId,
        sequencia: trip.seq
      })),

      excecoes: (dados.timetable?.exceptions || []).map(exc => ({
        data: exc.date,
        id_servico: exc.serviceId,
        tipo: exc.type,
        descricao:
          exc.type === -1
            ? 'Serviço removido nesta data'
            : exc.type === 1
              ? 'Serviço adicionado nesta data'
              : 'Alteração desconhecida'
      })),

      sentidos: (dados.timetable?.directions || [])
        .sort((a, b) => a.directionId - b.directionId)
        .map(sentido => ({
          id_sentido: sentido.directionId,
          descricao: sentido.desc,
          destino:
            destinosPorSentido[sentido.directionId] || sentido.desc,

          servicos: (sentido.services || []).map(servico => ({
            id_servico: servico.serviceId,
            descricao: servico.desc,
            vigencia: {
              inicio: servico.start,
              fim: servico.end
            },
            dias_semana: servico.days,
            qtd_partidas: servico.departures?.length || 0,

            partidas: (servico.departures || []).map(partida => ({
              partida: partida.dep,
              chegada: partida.arr,
              sequencia: partida.seq,
              embarque_acessivel: partida.wa === 1,
              viagem_extra: partida.extra,
              checkpoint: partida.ckpt
            }))
          }))
        }))
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Erro ao consultar horários',
      detalhe: error.message
    });
  }
});

/*
Esta rota retorna apenas o itinerario de um linha especifica
*/
app.get('/viagens/:tripId', async (req, res) => {
  const inicio = performance.now();
  const { tripId } = req.params;

  try {
    const resDetalhes = await fetch(
      `https://mobilibus.com/api/trip-details?v=2&trip_id=${tripId}`
    );

    if (!resDetalhes.ok) {
      return res.status(404).json({
        error: 'Viagem não encontrada'
      });
    }

    const detalhes = await resDetalhes.json();

    const paradas = (detalhes.stops || []).map((stop, index) => ({
      ordem: index + 1,
      id_parada: stop.stopId,
      nome: stop.name,
      latitude: stop.lat,
      longitude: stop.lng,
      tempo_acumulado: stop.int,
      tempo_espera: stop.wait
    }));

    res.json({
      tempo_execucao: `${(
        performance.now() - inicio
      ).toFixed(2)}ms`,

      viagem: {
        id: Number(tripId),
        nome: detalhes.tripName,
        linha: detalhes.routeName,
        tarifa: Number(detalhes.price),
        timezone_offset: detalhes.tzOffset
      },

      estatisticas: {
        qtd_paradas: paradas.length
      },

      itinerario: {
        shape: detalhes.shape,
        paradas
      }
    });

  } catch (error) {
    console.error(
      'Erro na rota /viagens/:tripId:',
      error.message
    );

    res.status(500).json({
      error: 'Erro ao consultar viagem',
      detalhe: error.message
    });
  }
});

/* 
Esta rota retorna detalhes do veiculos em tempo real por viagem de uma linha especifica
*/
app.get('/viagens/:tripId/veiculos', async (req, res) => {
  const inicio = performance.now();
  const { tripId } = req.params;

  try {
    const resposta = await fetch(
      `https://mobilibus.com/api/vehicles?origin=web&trip_id=${tripId}`
    );

    if (!resposta.ok) {
      return res.status(404).json({
        error: 'Viagem não encontrada'
      });
    }

    const dados = await resposta.json();

    const veiculos = (
      Array.isArray(dados)
        ? dados
        : []
    ).map(vehicle => ({
      prefixo: vehicle.vehicleId,
      latitude: vehicle.lat,
      longitude: vehicle.lng,
      progresso: vehicle.percTravelled,
      angulo: vehicle.heading,
      parada_atual: vehicle.seq,
      horario_partida: vehicle.startTime,
      ultimo_sinal: vehicle.positionTime,
      delay: vehicle.delay,
      status:
        Math.abs(vehicle.delay) <= 60
          ? 'No horário'
          : vehicle.delay > 0
            ? 'Atrasado'
            : 'Adiantado',
      delay_formatado: formatarDelay(vehicle.delay)
    }));

    res.json({
      tempo_execucao: `${(
        performance.now() - inicio
      ).toFixed(2)}ms`,

      qtd_veiculos: veiculos.length,

      veiculos
    });

  } catch (error) {
    console.error(
      'Erro na rota /viagens/:tripId/veiculos:',
      error.message
    );

    res.status(500).json({
      error: 'Erro ao consultar veículos',
      detalhe: error.message
    });
  }
});

/* 
Esta rota retorna os pontos de parada do sistema DF No Ponto.
*/
app.get('/paradas', async (req, res) => {
  const inicio = performance.now();

  try {
    const resposta = await fetch(
      'https://otp.mobilibus.com/FY7J-lwk85QGbn/otp/routers/default/index/stops'
    );

    if (!resposta.ok) {
      throw new Error(`OTP retornou ${resposta.status}`);
    }

    const paradas = await resposta.json();

    return res.json({
      tempo_execucao: `${(performance.now() - inicio).toFixed(2)}ms`,
      quantidade: paradas.length,
      paradas: paradas.map(parada => ({
        id_parada_hash: parada.id,
        codigo: parada.code || null,
        nome: parada.name,
        latitude: parada.lat,
        longitude: parada.lon
      }))
    });

  } catch (error) {
    console.error('Erro na rota /paradas:', error);
    return res.status(500).json({
      error: 'Erro ao buscar paradas',
      detalhe: error.message
    });
  }
});

/* 
Esta rota retorna um ponto de parada especifico do sistema DF No Ponto.
*/
app.get('/paradas/:id_parada_hash', async (req, res) => {
  const inicio = performance.now();
  const { id_parada_hash } = req.params;

  try {
    const resposta = await fetch(
      `https://otp.mobilibus.com/FY7J-lwk85QGbn/otp/routers/default/index/stops/${id_parada_hash}`
    );

    if (!resposta.ok) {
      return res.status(404).json({
        error: 'Parada não encontrada'
      });
    }

    const parada = await resposta.json();

    return res.json({
      tempo_execucao: `${(performance.now() - inicio).toFixed(2)}ms`,

      parada: {
        id_parada_hash: parada.id,
        codigo: parada.code || null,
        nome: parada.name,
        latitude: parada.lat,
        longitude: parada.lon
      }
    });

  } catch (error) {
    console.error(
      'Erro na rota /paradas/:id_parada_hash:',
      error
    );

    return res.status(500).json({
      error: 'Erro ao buscar parada',
      detalhe: error.message
    });
  }
});

/* 
Esta rota retorna os horarios que cada linha vai passar por ponto de parada especifico do sistema DF No Ponto.
*/
app.get('/paradas/:id_parada_hash/horarios', async (req, res) => {
  const inicio = performance.now();

  try {
    const { id_parada_hash } = req.params;

    const data =
      req.query.data ||
      new Date().toISOString().slice(0, 10).replace(/-/g, '');

    const respostaParada = await fetch(
      `https://otp.mobilibus.com/FY7J-lwk85QGbn/otp/routers/default/index/stops/${id_parada_hash}`
    );

    if (!respostaParada.ok) {
      return res.status(404).json({
        error: 'Parada não encontrada'
      });
    }

    const parada = await respostaParada.json();

    const respostaHorarios = await fetch(
      `https://otp.mobilibus.com/FY7J-lwk85QGbn/otp/routers/default/index/stops/${parada.id}/stoptimes/${data}`
    );

    if (!respostaHorarios.ok) {
      return res.status(404).json({
        error: 'Horários não encontrados para a data informada'
      });
    }

    const dadosHorarios = await respostaHorarios.json();

    function segundosParaHora(segundos) {
      const h = Math.floor(segundos / 3600);
      const m = Math.floor((segundos % 3600) / 60);

      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    return res.json({
      tempo_execucao: `${(performance.now() - inicio).toFixed(2)}ms`,

      parada: {
        id_parada_otp: parada.id,
        codigo: parada.code || null,
        nome: parada.name,
        latitude: parada.lat,
        longitude: parada.lon
      },

      data_consulta: data,
      qtd_linhas: dadosHorarios.length,

      linhas: dadosHorarios.map(item => {
        const partes = item.pattern?.id?.split(':') || [];

        return {
          id_pattern: item.pattern?.id || null,
          sentido: Number(partes[2]),

          id_linha: item.pattern?.route?.id || null,
          codigo_linha: item.pattern?.route?.shortName || null,
          nome_linha: item.pattern?.route?.longName || null,

          operadora: item.pattern?.route?.agencyName || null,
          cor_operadora: item.pattern?.route?.color || null,

          destino:
            item.times?.[0]?.headsign ||
            item.pattern?.desc ||
            null,

          qtd_horarios: item.times?.length || 0,

          horarios: (item.times || [])
            .sort((a, b) => a.scheduledArrival - b.scheduledArrival)
            .map(t => ({
              trip_id: t.tripId,
              pattern_id: item.pattern?.id || null,

              horario: segundosParaHora(t.scheduledArrival),
              horario_segundos: t.scheduledArrival,

              parada_numero: t.stopIndex + 1,
              total_paradas: t.stopCount,

              tempo_real: t.realtime,
              estado: t.realtimeState,

              veiculo: t.vehicleId || null
            }))
        };
      })
    });

  } catch (error) {
    console.error(
      'Erro na rota /paradas/:id_parada_hash/horarios:',
      error
    );

    return res.status(500).json({
      error: 'Erro ao buscar horários da parada',
      detalhe: error.message
    });
  }
});

/* 
Esta rota retorna as previsoes de cada linha que vai passar por ponto de parada especifico do sistema DF No Ponto.
*/
app.get('/paradas/:id_parada_hash/proximos', async (req, res) => {
  const inicio = performance.now();

  try {
    const { id_parada_hash } = req.params;

    const respostaParada = await fetch(
      `https://otp.mobilibus.com/FY7J-lwk85QGbn/otp/routers/default/index/stops/${id_parada_hash}`
    );

    if (!respostaParada.ok) {
      return res.status(404).json({
        error: 'Parada não encontrada.'
      });
    }

    const parada = await respostaParada.json();

    const idParada = parada.id.split(':')[1];

    const respostaDepartures = await fetch(
      `https://mobilibus.com/api/departures?v=2&stop_id=${idParada}`
    );

    if (!respostaDepartures.ok) {
      return res.status(404).json({
        error: 'Próximos ônibus não encontrados.'
      });
    }

    const dados = await respostaDepartures.json();

    res.json({
      tempo_execucao: `${(performance.now() - inicio).toFixed(2)}ms`,

      parada: {
        id_parada_hash,
        id_parada: parada.id,
        codigo: parada.code || null,
        nome: parada.name,
        latitude: parada.lat,
        longitude: parada.lon
      },

      qtd_linhas: dados.trips?.length || 0,

      linhas: (dados.trips || []).map(linha => ({
        id_linha: linha.routeId,
        id_viagem: linha.tripId,

        codigo_linha: linha.shortName,
        nome_linha: linha.longName,

        destino: linha.headsign,
        sentido: linha.directionId,

        cor_operadora: linha.color,
        tarifa: linha.price,
        ar_condicionado: linha.ac,

        qtd_proximos: linha.departures?.length || 0,

        proximos: (linha.departures || []).map(p => ({
          horario: p.time,
          proximo_dia: p.nextDay,

          acessivel: p.wa,
          ar_condicionado: p.ac,
          bicicletas: p.bikes,
          viagem_extra: p.extra,

          veiculo: p.vehicleId || null,
          gps_horario: p.gpsTime || null,

          ultimo_sinal_segundos: p.positionAge || null,
          direcao_graus: p.bearing || null,

          parada_atual: p.stopSequence || null,
          atraso_viagem_anterior: p.previousTripDelay || null,

          trip_feed_id: p.tripFeedId || null
        }))
      })),

      qtd_alertas: dados.alerts?.length || 0,

      alertas: (dados.alerts || []).map(alerta => ({
        id_linha_hash: alerta.routeId || null,
        causa: alerta.cause || null,
        efeito: alerta.effect || null,
        idioma: alerta.lang || null,
        titulo: alerta.header || null,
        descricao: alerta.details || null
      }))
    });

  } catch (error) {
    console.error(
      'Erro na rota /paradas/:id_parada_hash/proximos:',
      error.message
    );

    res.status(500).json({
      error: 'Erro ao buscar próximos ônibus.',
      detalhe: error.message
    });
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
      qtd_alertas: dadosAlertasHash.length,
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
                nome_linha: linhaHash?.longName,
                cor_operadora: linhaHash?.color
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
          qtd_operadoras_afetadas: operadorasAfetadas.length,
          operadoras_afetadas: operadorasAfetadas,
          qtd_linhas_afetadas: linhasAfetadas.length,
          linhas_afetadas: linhasAfetadas
        };
      })
    });

  } catch (error) {
    console.error('Erro na rota /alertas:', error.message );
    res.status(500).json({ error: 'Erro ao buscar dados da API', detalhe: error.message });
  }
});

/* 
Esta rota retorna detalhes sobre noticias do sistema DF No Ponto.
*/
app.get('/noticias', async (req, res) => {
  const inicio = performance.now();

  const formatarData = (timestamp) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
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

    const [respostaHash, respostaId] = await Promise.all([
      fetch('https://mobilibus.com/api/news?origin=web&project_hash=3c189'),
      fetch('https://mobilibus.com/api/news?origin=web&project_id=313')
    ]);

    const noticiasHash = await respostaHash.json();
    const noticiasId = await respostaId.json();

    res.json({
      tempo_execucao: `${(performance.now() - inicio).toFixed(2)}ms`,

      qtd_noticias: noticiasHash.length,

      noticias: noticiasHash.map((noticiaHash, index) => {
        const noticiaId = noticiasId[index];

        return {
          id_noticia_hash: noticiaHash.newsId,
          id_noticia: noticiaId?.newsId || null,

          inicio_publicacao: formatarData(
            noticiaHash.activeFrom
          ),

          fim_publicacao: formatarData(
            noticiaHash.activeTo
          ),

          titulo: noticiaHash.title,
          conteudo: noticiaHash.content,

          possui_imagem: !!noticiaHash.urlImage,
          imagem: noticiaHash.urlImage || null,

          possui_link: !!noticiaHash.linkUrl,
          link: noticiaHash.linkUrl || null
        };
      })
    });

  } catch (error) {
    console.error(
      'Erro na rota /noticias:',
      error.message
    );

    res.status(500).json({
      error: 'Erro ao buscar dados da API',
      detalhe: error.message
    });
  }
});

export default app;