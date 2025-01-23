const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Inicialización del servidor
const app = express();
const port = 3000;

// Middleware para permitir recibir datos binarios de archivos
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Función para overlay circular con ImageMagick
function overlayCircularImage(backgroundPath, overlayPath, outputPath) {
  const tempCircleLogoPath = 'circle_logo.png';
  const tempMaskPath = 'mask.png';

  // Crear la máscara circular
  exec(`convert -size 370x370 xc:none -fill white -draw "circle 185,185 185,1" ${tempMaskPath}`, (err, stdout, stderr) => {
    if (err) {
      console.error('Error creando la máscara circular:', stderr);
      return;
    }
    // Aplicar la máscara al logo
    exec(`convert ${overlayPath} -resize 370x370^ -gravity center -extent 370x370 ${tempMaskPath} -alpha Off -compose CopyOpacity -composite ${tempCircleLogoPath}`, (err, stdout, stderr) => {
      if (err) {
        return;
      }
      // Superponer el logo circular sobre el fondo
      exec(`convert ${backgroundPath} ${tempCircleLogoPath} -geometry +173+30 -composite ${outputPath}`, (err, stdout, stderr) => {
        if (err) {
          return;
        }
        // Limpiar los archivos temporales
        fs.unlinkSync(tempMaskPath);
        fs.unlinkSync(tempCircleLogoPath);
      });
    });
  });
}

// Ruta para manejar la carga de imágenes (solo logo)
app.post('/upload', (req, res) => {
  const logoFile = req.body.logo;

  // Comprobamos si se ha subido el logo
  if (!logoFile) {
    return res.status(400).json({ error: 'Falta la imagen del logo para procesar.' });
  }

  // Guardamos el logo en el servidor
  const logoPath = path.join(__dirname, 'uploads', 'logo.png');
  fs.writeFileSync(logoPath, Buffer.from(logoFile, 'base64'));

  // Ruta para la imagen de fondo (ya existente en el proyecto)
  const backgroundPath = path.join(__dirname, 'public', 'fondo.jpg');  // Asegúrate de tener esta imagen en 'public'

  // Ruta para la imagen procesada
  const outputPath = path.join(__dirname, 'uploads', 'resultado.jpg');

  // Llamamos a la función de superposición de imágenes
  overlayCircularImage(backgroundPath, logoPath, outputPath);

  // Enviamos la imagen procesada como respuesta en base64
  const resultBuffer = fs.readFileSync(outputPath);
  const base64Image = resultBuffer.toString('base64');

  // Enviamos el resultado
  res.json({ imageBase64: `data:image/jpeg;base64,${base64Image}` });

  // Eliminamos los archivos temporales después de procesarlos
  fs.unlinkSync(logoPath);
  fs.unlinkSync(outputPath);
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
