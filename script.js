const canvas = document.getElementById('audioCanvas');
const ctx = canvas.getContext('2d');
const audioFileInput = document.getElementById('audioFile');
const imageFileInput = document.getElementById('imageFile');

canvas.width = 400;
canvas.height = 400;

let img = null;

function escolhaAleatoria(arr) {
    const indiceAleatorio = Math.floor(Math.random() * arr.length);
    return arr[indiceAleatorio];
}

imageFileInput.addEventListener('change', function() {
    const file = this.files[0];
    const reader = new FileReader();

    reader.onload = function(event) {
        img = new Image();
        img.src = event.target.result;
        img.onload = function() {
            drawImageAndSpectrum();
        };
    };

    if (file) {
        reader.readAsDataURL(file);
    }
});

audioFileInput.addEventListener('change',function () {
    const file = this.files[0];
    if(!file) return;

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const reader = new FileReader();

    reader.onload = function (event) {
        audioContext.decodeAudioData(event.target.result, function (buffer) {
            playAudio(buffer, audioContext);
        });
    };

    reader.readAsArrayBuffer(file);
});

// Lista de ângulos para formar uma cruz (em radianos)
const crossAngles = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]; // 0°, 90°, 180°, 270°

// Lista de ângulos para diagonais (em radianos)
const diagonalAngles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]; // 45°, 135°, 225°, 315°

function playAudio(buffer, audioContext) {
    const audioSource = audioContext.createBufferSource();
    const analyser = audioContext.createAnalyser();

    audioSource.buffer = buffer;
    audioSource.connect(analyser);
    analyser.connect(audioContext.destination);
    audioSource.start();

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw(angleOffset) {
        requestAnimationFrame(draw);

        analyser.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 50; //Raio do círculo
        const amplitude = 40; //Amplitude da onda

        ctx.beginPath();

        for(let i = 0; i < bufferLength; i++){
            const angle = (i / bufferLength) * Math.PI * 2 - angleOffset;
            const barHeight = dataArray[i];
            const normalizedHeight = Math.sin(angle * 8) * (barHeight / 255) * amplitude; // Normaliza o valor da barra para o alcance desejado

            const x = centerX + Math.cos(angle) * (radius + normalizedHeight);
            const y = centerY + Math.sin(angle) * (radius + normalizedHeight);

            if (i === 0) {
                ctx.moveTo(x, y); //Move para a primeira posição
            } else {
                ctx.lineTo(x, y); //Desenha uma linha até a nova posição
            }
        }

        //Fecha o caminho
        ctx.closePath();
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(255, 50, 50, 0.6)');
        gradient.addColorStop(0.5, 'rgba(50, 50, 255, 0.6)');
        gradient.addColorStop(1, 'rgba(50, 255, 50, 0.6)');
        
        ctx.fillStyle = gradient;
        ctx.fill();

        // Desenha a borda do círculo
        ctx.strokeStyle = 'white'; // Cor da borda
        ctx.lineWidth = 1; // Espessura da borda
        ctx.stroke();

        drawImageAndSpectrum();
    }

    const angleOffset = Math.PI / 2; // Começar na parte superior do círculo

    draw(-angleOffset);
}

function drawImageAndSpectrum() {
    if (img) {
        const imgSize = 200; // Tamanho da imagem
        const centerX = (canvas.width / 2) - imgSize / 2;
        const centerY = (canvas.height / 2) - imgSize / 2 - 10;
        ctx.drawImage(img, centerX, centerY, imgSize, imgSize);
    }
}
