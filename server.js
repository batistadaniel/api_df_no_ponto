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



app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});