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

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});