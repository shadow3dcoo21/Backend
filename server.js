const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Presentar = require('./models/Presentar');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

mongoose.connect('mongodb://localhost:27017/sinvoz', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Conexión a MongoDB establecida.');
  })
  .catch(err => console.error('Error al conectar con MongoDB:', err));

  app.use(express.json());
  app.use(cors());
  app.use('/imagenes', express.static(path.join(__dirname, 'imagenes')));
  app.use('/videos', express.static(path.join(__dirname, 'videos')));
  
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, 'imagenes');
      } else if (file.mimetype.startsWith('video/')) {
        cb(null, 'videos');
      } else {
        cb({ message: 'Este formato de archivo no es soportado' }, false);
      }
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  });
  
  const upload = multer({ storage });
  
  app.post('/presentar', upload.fields([
    { name: 'imagen', maxCount: 1 },
    { name: 'titulos[0][video]', maxCount: 1 },
    { name: 'titulos[1][video]', maxCount: 1 },
    { name: 'titulos[2][video]', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const { nombre } = req.body;
      const imagen = `/imagenes/${req.files['imagen'][0].filename}`;
  
      const titulos = [
        {
          titulo: req.body['titulos[0][titulo]'],
          video: `/videos/${req.files['titulos[0][video]'][0].filename}`
        },
        {
          titulo: req.body['titulos[1][titulo]'],
          video: `/videos/${req.files['titulos[1][video]'][0].filename}`
        },
        {
          titulo: req.body['titulos[2][titulo]'],
          video: `/videos/${req.files['titulos[2][video]'][0].filename}`
        }
      ];
  
      const presentacion = new Presentar({ nombre, imagen, titulos });
      await presentacion.save();
      res.json({ message: 'Datos de presentación guardados exitosamente' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al guardar los datos de presentación' });
    }
  });
  
  app.get('/presentar', async (req, res) => {
    try {
      const presentaciones = await Presentar.find();
      res.json(presentaciones);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener los datos de presentación' });
    }
  });


// Nueva ruta para obtener una presentación por nombre
app.get('/completar/:nombre', async (req, res) => {
  try {
    const nombre = req.params.nombre;
    const presentacion = await Presentar.findOne({ nombre });

    if (presentacion) {
      res.json(presentacion);
    } else {
      res.status(404).json({ message: 'No se encontró la presentación con ese nombre' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la presentación' });
  }
});

// Nueva ruta para obtener una presentación por nombre y aplicar un tipo específico de manipulación
app.get('/completar/:nombre/:tipo', async (req, res) => {
  try {
    const { nombre, tipo } = req.params;
    const presentacion = await Presentar.findOne({ nombre });

    if (presentacion) {
      let resultado;
      let letrasEliminadas;
      switch (tipo) {
        case 'incompleto1':
          [resultado, letrasEliminadas] = removeFirstLetter(presentacion.nombre);
          break;
        case 'incompleto2':
          [resultado, letrasEliminadas] = removeTwoRandomLettersWithUnderscore(presentacion.nombre);
          break;
        case 'incompletoTotal':
          resultado = ''; // Devuelve una cadena vacía
          break;
        case 'letrasSeparadas':
          resultado = presentacion.nombre.split('');
          break;
        default:
          return res.status(400).json({ message: 'Tipo no válido' });
      }
      res.json({ nombreOriginal: presentacion.nombre, nombreManipulado: resultado, letrasEliminadas });
    } else {
      res.status(404).json({ message: 'No se encontró la presentación con ese nombre' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la presentación' });
  }
});
//
// Nueva ruta para obtener una presentación por nombre y aplicar un tipo específico de manipulación
app.get('/completar/:nombre/:tipo/:letraFaltante', async (req, res) => {
  try {
    const { nombre, tipo, letraFaltante } = req.params;
    const presentacion = await Presentar.findOne({ nombre });

    if (presentacion) {
      let resultado;
      let letrasEliminadas;
      switch (tipo) {
        case 'incompleto1':
          [resultado, letrasEliminadas] = removeFirstLetter(presentacion.nombre);
          break;
        case 'incompleto2':
          [resultado, letrasEliminadas] = removeTwoRandomLettersWithUnderscore(presentacion.nombre);
          break;
        case 'incompletoTotal':
          resultado = ''; // Devuelve una cadena vacía
          break;
        case 'letrasSeparadas':
          resultado = presentacion.nombre.split('');
          break;
        default:
          return res.status(400).json({ message: 'Tipo no válido' });
      }

      if (!validateMissingLetter(letrasEliminadas, letraFaltante)) {
        res.json({ nombreOriginal: presentacion.nombre, nombreManipulado: resultado, letrasEliminadas });
      } else {
        res.status(400).json({ message: 'Letra faltante incorrecta' });
      }
    } else {
      res.status(404).json({ message: 'No se encontró la presentación con ese nombre' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la presentación' });
  }
});

function validateMissingLetter(letrasEliminadas, missingLetter) {
  return !letrasEliminadas.includes(missingLetter);
}

// Función para remover la primera letra y reemplazarla por _
function removeFirstLetter(str) {
  if (str.length <= 1) return ['_', str]; // Si la longitud es 1 o menos, devuelve un solo guion bajo

  const letraEliminada = str.charAt(0);
  const resultado = '_' + str.substring(1);
  return [resultado, letraEliminada];
}

// Función para remover dos letras aleatorias y reemplazarlas por _
function removeTwoRandomLettersWithUnderscore(str) {
  if (str.length <= 2) return [str.substring(1), '']; // Si la longitud es 2 o menos, solo remueve la primera letra

  let chars = str.split('');
  let indexesToRemove = [];

  while (indexesToRemove.length < 2) {
    let randomIndex = Math.floor(Math.random() * (chars.length - 1)) + 1; // Evita la primera letra
    if (!indexesToRemove.includes(randomIndex)) {
      indexesToRemove.push(randomIndex);
    }
  }

  indexesToRemove.sort((a, b) => b - a); // Ordena en orden descendente para no cambiar índices al remover

  let letrasEliminadas = [];
  for (let index of indexesToRemove) {
    const letraEliminada = chars[index];
    letrasEliminadas.push(letraEliminada);
    chars.splice(index, 1, '_'); // Reemplaza la letra eliminada por _
  }

  return [chars.join(''), letrasEliminadas];
}


app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
