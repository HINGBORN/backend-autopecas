const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

// Configurando o Multer para guardar o arquivo na memória temporária
const upload = multer({ storage: multer.memoryStorage() });

// Conexão com o banco de dados
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado ao MongoDB com sucesso!"))
  .catch((err) => console.log("❌ Erro ao conectar ao MongoDB:", err));

// Schema do banco de dados (agora com a imagemUrl)
const pecaSchema = new mongoose.Schema({
  id: String,
  nome: String,
  marca: String,
  estoque: Number,
  preco: Number,
  localizacao: String,
  imagemUrl: String 
});

const Peca = mongoose.model('Peca', pecaSchema);

// ==========================================
// ROTAS DA API
// ==========================================

// Rota de teste
app.get('/', (req, res) => res.json({ message: "Servidor da Auto Peças Canadá está funcionando!" }));

// LER (GET) - Buscar todas as peças
app.get('/pecas', async (req, res) => {
  try {
    const pecas = await Peca.find();
    res.json(pecas);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar peças." });
  }
});

// CRIAR (POST) - Adicionar peça e fazer upload da imagem
app.post('/pecas', upload.single('imagem'), async (req, res) => {
  try {
    let linkDaFoto = null;

    // Se o frontend enviou uma imagem, faz o envio para o ImgBB
    if (req.file) {
      const base64Image = req.file.buffer.toString('base64');
      const formData = new URLSearchParams();
      formData.append('key', process.env.IMGBB_API_KEY);
      formData.append('image', base64Image);

      const imgbbResponse = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: formData
      });
      
      const imgbbData = await imgbbResponse.json();
      if (imgbbData.success) {
        linkDaFoto = imgbbData.data.url;
      } else {
        console.error("❌ Erro no ImgBB:", imgbbData);
      }
    }

    // Cria a peça no banco com os dados e a URL da foto
    const novaPeca = new Peca({
      id: req.body.id,
      nome: req.body.nome,
      marca: req.body.marca,
      estoque: req.body.estoque,
      preco: req.body.preco,
      localizacao: req.body.localizacao,
      imagemUrl: linkDaFoto
    });

    await novaPeca.save();
    res.status(201).json(novaPeca);

  } catch (error) {
    console.error("Erro na rota POST:", error);
    res.status(500).json({ message: "Erro ao salvar nova peça." });
  }
});

// ATUALIZAR (PUT) - Editar uma peça
app.put('/pecas/:_id', async (req, res) => {
    try {
        const pecaAtualizada = await Peca.findByIdAndUpdate(req.params._id, req.body, { new: true });
        res.json(pecaAtualizada);
    } catch (error) {
        res.status(500).json({ message: "Erro ao atualizar peça." });
    }
});

// DELETAR (DELETE) - Excluir uma peça
app.delete('/pecas/:_id', async (req, res) => {
    try {
        await Peca.findByIdAndDelete(req.params._id);
        res.json({ message: "Peça deletada com sucesso." });
    } catch (error) {
        res.status(500).json({ message: "Erro ao deletar peça." });
    }
});

// Inicializando o servidor
const PORTA = process.env.PORT || 3001;
app.listen(PORTA, () => {
  console.log(`🚀 Servidor backend rodando na porta ${PORTA}`);
});