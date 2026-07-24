const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado ao MongoDB com sucesso!"))
  .catch((err) => console.log("❌ Erro ao conectar ao MongoDB:", err));

const pecaSchema = new mongoose.Schema({
  id: String,
  nome: String,
  marca: String,
  estoque: Number,
  preco: Number,
  localizacao: String,
  imagemUrl: String, // Mantém o antigo para compatibilidade
  imagensUrls: [String] // Adiciona o novo para a galeria
});

const Peca = mongoose.model('Peca', pecaSchema);

// Função revertida para o formato Base64 (Super estável no Node.js)
async function uploadParaImgBB(fileBuffer) {
  const base64Image = fileBuffer.toString('base64');
  const formData = new URLSearchParams();
  formData.append('key', process.env.IMGBB_API_KEY);
  formData.append('image', base64Image);

  try {
    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    return data.success ? data.data.url : null;
  } catch (error) {
    console.error("Erro no upload do ImgBB:", error);
    return null;
  }
}

app.get('/', (req, res) => res.json({ message: "Servidor da Auto Peças Canadá está funcionando!" }));

app.get('/pecas', async (req, res) => {
  try {
    const pecas = await Peca.find();
    res.json(pecas);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar peças." });
  }
});

app.post('/pecas', upload.array('imagens', 4), async (req, res) => {
  try {
    let urlsDasFotos = [];
    if (req.files && req.files.length > 0) {
      // Upload sequencial (um por vez) para respeitar o limite gratuito do ImgBB
      for (const file of req.files) {
        const url = await uploadParaImgBB(file.buffer);
        if (url) urlsDasFotos.push(url);
      }
    }

    const novaPeca = new Peca({
      ...req.body,
      imagensUrls: urlsDasFotos
    });

    await novaPeca.save();
    res.status(201).json(novaPeca);

  } catch (error) {
    res.status(500).json({ message: "Erro ao salvar nova peça." });
  }
});

app.put('/pecas/:_id', upload.array('imagens', 4), async (req, res) => {
    try {
        let dadosAtualizados = { ...req.body };
        
        // Se o front mandou uma lista de imagens que devem ser mantidas
        if (req.body.imagensUrlsMantidas) {
            try {
                dadosAtualizados.imagensUrls = JSON.parse(req.body.imagensUrlsMantidas);
            } catch (e) {
                dadosAtualizados.imagensUrls = [];
            }
        } else if (!req.files || req.files.length === 0) {
            // Se não mandou fotos novas e nem lista mantida, garante que não apaga por engano se vier indefinido
            delete dadosAtualizados.imagensUrls;
        }

        // Se houver novas fotos para adicionar junto
        if (req.files && req.files.length > 0) {
            let urlsDasFotosNovas = [];
            for (const file of req.files) {
                const url = await uploadParaImgBB(file.buffer);
                if (url) urlsDasFotosNovas.push(url);
            }
            // Junta as que já estavam mantidas com as novas fotos enviadas
            const jaMantidas = dadosAtualizados.imagensUrls || [];
            dadosAtualizados.imagensUrls = [...jaMantidas, ...urlsDasFotosNovas];
        }

        // Limpa campo legado se existir
        dadosAtualizados.imagemUrl = '';

        const pecaAtualizada = await Peca.findByIdAndUpdate(req.params._id, dadosAtualizados, { new: true });
        res.json(pecaAtualizada);
    } catch (error) {
        res.status(500).json({ message: "Erro ao atualizar peça." });
    }
});

app.delete('/pecas/:_id', async (req, res) => {
  try {
    await Peca.findByIdAndDelete(req.params._id);
    res.json({ message: "Peça deletada com sucesso." });
  } catch (error) {
    res.status(500).json({ message: "Erro ao deletar peça." });
  }
});

const PORTA = process.env.PORT || 3001;
app.listen(PORTA, () => {
  console.log(`🚀 Servidor backend rodando na porta ${PORTA}`);
});