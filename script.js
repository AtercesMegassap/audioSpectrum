const canvas = document.getElementById('audioCanvas');
const ctx = canvas.getContext('2d');
const audioFileInput = document.getElementById('audioFile');
const imageFileInput = document.getElementById('imageFile');
const downloadVideoBtn = document.getElementById('downloadVideo');
const videoPreview = document.getElementById('videoPreview');

canvas.width = 400;
canvas.height = 400;

let img = null;
let mediaRecorder;
let recordedChunks = [];
let audioStream;
let audioContext;
let audioSource;

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

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const reader = new FileReader();

    reader.onload = function (event) {
        audioContext.decodeAudioData(event.target.result, function (buffer) {
            playAudio(buffer, audioContext);
        });
    };

    reader.readAsArrayBuffer(file);
});

function playAudio(buffer, audioContext) {
    audioSource = audioContext.createBufferSource();
    const analyser = audioContext.createAnalyser();

    audioSource.buffer = buffer;
    audioSource.connect(analyser);
    analyser.connect(audioContext.destination);

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Captura o áudio para o vídeo
    audioStream = audioContext.createMediaStreamDestination();
    audioSource.connect(audioStream);

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

    // Começa a gravar quando o áudio começa a tocar
    audioSource.start();
    // Para de gravar ao fim do áudio
    audioSource.onended = () => {
        setTimeout(() => {
            mediaRecorder.stop();
        }, 1000);  // Adiciona uma pausa de 1000ms
    };
    startRecording(); // Inicia a gravação junto com o áudio

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

// Iniciar gravação
function startRecording() {
    const canvasStream = canvas.captureStream(60); // Capture video at 120 FPS
    const combinedStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioStream.stream.getAudioTracks()]);

    mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
    recordedChunks = [];

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        videoPreview.src = url;
        downloadVideoBtn.disabled = false; // Habilitar o botão de download
    };

    mediaRecorder.start();
}

// Parar gravação
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop(); // Para a gravação quando o áudio acabar
    }
}

// Download the recorded video
downloadVideoBtn.addEventListener('click', () => {
    const url = videoPreview.src;
    const a = document.createElement('a');
    a.href = url;
    a.download = 'output_with_audio.webm';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});
