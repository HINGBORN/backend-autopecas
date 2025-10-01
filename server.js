const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

const SUA_CONNECTION_STRING = process.env.DATABASE_URL;

mongoose.connect(SUA_CONNECTION_STRING)
  .then(() => console.log("✅ Conectado ao MongoDB com sucesso!"))
  .catch((err) => console.log("❌ Erro ao conectar ao MongoDB:", err));

const pecaSchema = new mongoose.Schema({
  id: String,
  nome: String,
  marca: String,
  estoque: Number,
  preco: Number,
  localizacao: String
});

const Peca = mongoose.model('Peca', pecaSchema);

const PORTA = process.env.PORT || 3001;

app.get('/', (req, res) => res.json({ message: "Servidor da Auto Peças Canadá está funcionando!" }));

// ROTA GET (Ler todas as peças)
app.get('/pecas', async (req, res) => {
  try {
    const pecas = await Peca.find();
    res.json(pecas);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar peças." });
  }
});

// ROTA POST (Criar uma peça)
app.post('/pecas', async (req, res) => {
  try {
    const novaPeca = new Peca(req.body);
    await novaPeca.save();
    res.status(201).json(novaPeca);
  } catch (error) {
    res.status(500).json({ message: "Erro ao salvar nova peça." });
  }
});

// ==========================================================
// NOVA ROTA: Atualizar uma peça (UPDATE)
// ==========================================================
app.put('/pecas/:_id', async (req, res) => {
    try {
        const pecaAtualizada = await Peca.findByIdAndUpdate(req.params._id, req.body, { new: true });
        res.json(pecaAtualizada);
    } catch (error) {
        res.status(500).json({ message: "Erro ao atualizar peça." });
    }
});

// ==========================================================
// NOVA ROTA: Deletar uma peça (DELETE)
// ==========================================================
app.delete('/pecas/:_id', async (req, res) => {
    try {
        await Peca.findByIdAndDelete(req.params._id);
        res.json({ message: "Peça deletada com sucesso." });
    } catch (error) {
        res.status(500).json({ message: "Erro ao deletar peça." });
    }
});


app.listen(PORTA, () => {
  console.log(`🚀 Servidor backend rodando na porta ${PORTA}`);
});