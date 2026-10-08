let allSongs = [
    "songs/kahaniSuno.mp3",
    "songs/Jhool.mp3",
    "songs/LikheJoKhatTujhe.mp3",
    "songs/MereMehboobQayamat.mp3",
    "songs/MeriZindagiMainAna.mp3",
    "songs/NightDrive.mp3",
    "songs/PalPal.mp3",
    "songs/SeeneSeSirKo.mp3",
    "songs/Talwinder.mp3",
    "songs/HeadPhones.mp3"
];

let songs = [];
let audio = new Audio();
let addedSongs = [];
let currentSongIndex = -1;
let db;

let songItemContainer = document.querySelector(".songItemContainer");
let masterPlay = document.getElementById("masterPlay");
let progressBar = document.getElementById("myProgressbar");
let gif = document.getElementById("gif");
let previous = document.getElementById("previous");
let next = document.getElementById("next");
let bottomSongName = document.getElementById("bottomSongName");
let bottomSongTime = document.getElementById("bottomSongTime");
let songUpload = document.getElementById("songUpload");

songUpload.accept = "audio/*,video/*";

let deletedStaticSongs = JSON.parse(localStorage.getItem("deletedStaticSongs") || "{}");
let renamedStaticSongs = JSON.parse(localStorage.getItem("renamedStaticSongs") || "{}");

function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "00:00";
    let minutes = Math.floor(seconds / 60);
    let secs = Math.floor(seconds % 60);
    return String(minutes).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
}

function resetButtons() {
    document.querySelectorAll(".playButton").forEach(button => {
        button.classList.remove("fa-circle-pause");
        button.classList.add("fa-circle-play");
    });
}

function resetTimes() {
    document.querySelectorAll(".songItem").forEach(item => {
        let currentTime = item.querySelector(".currentTime");
        if (currentTime) currentTime.textContent = "00:00";
    });
}

function getSongItems() {
    return Array.from(document.querySelectorAll(".songItem"));
}

function getCurrentSongItem() {
    let items = getSongItems();
    return currentSongIndex >= 0 ? items[currentSongIndex] : null;
}

function updateBottomSongName() {
    let item = getCurrentSongItem();

    if (!item) {
        bottomSongName.textContent = "No Song Playing";
        return;
    }

    let name = item.querySelector(".songName");
    bottomSongName.textContent = name ? name.textContent : "No Song Playing";
}

function loadSong(index) {
    let items = getSongItems();

    if (index < 0 || index >= items.length) return;

    let item = items[index];
    let src = item.dataset.songSrc;

    if (!src) return;

    currentSongIndex = index;
    audio.src = src;
    audio.load();

    resetButtons();
    resetTimes();

    let button = item.querySelector(".playButton");

    if (button) {
        button.classList.remove("fa-circle-play");
        button.classList.add("fa-circle-pause");
    }

    masterPlay.classList.remove("fa-circle-play");
    masterPlay.classList.add("fa-circle-pause");

    gif.style.opacity = "1";
    updateBottomSongName();

    audio.play().catch(() => {});
}

function createMenu(songItem) {
    let options = document.createElement("div");
    options.className = "songOptions";
    options.innerHTML = '<i class="fa-solid fa-ellipsis-vertical"></i>';

    options.style.position = "absolute";
    options.style.right = "15px";
    options.style.top = "50%";
    options.style.transform = "translateY(-50%)";
    options.style.cursor = "pointer";
    options.style.fontSize = "18px";
    options.style.padding = "8px";
    options.style.zIndex = "20";

    songItem.style.position = "relative";
    songItem.appendChild(options);

    let menu = document.createElement("div");
    menu.className = "songMenu";

    menu.innerHTML = `
        <button class="menuPlay">Play</button>
        <button class="menuRename">Rename</button>
        <button class="menuDelete">Delete</button>
    `;

    menu.style.display = "none";
    menu.style.position = "absolute";
    menu.style.right = "10px";
    menu.style.top = "45px";
    menu.style.zIndex = "1000";
    menu.style.background = "#222";
    menu.style.borderRadius = "8px";
    menu.style.padding = "6px";
    menu.style.minWidth = "100px";
    menu.style.boxShadow = "0 4px 15px rgba(0,0,0,0.4)";

    menu.querySelectorAll("button").forEach(button => {
        button.style.display = "block";
        button.style.width = "100%";
        button.style.border = "none";
        button.style.background = "transparent";
        button.style.color = "white";
        button.style.padding = "8px 12px";
        button.style.textAlign = "left";
        button.style.cursor = "pointer";
        button.style.borderRadius = "5px";
    });

    songItem.appendChild(menu);

    options.addEventListener("click", function(e) {
        e.stopPropagation();

        document.querySelectorAll(".songMenu").forEach(itemMenu => {
            if (itemMenu !== menu) {
                itemMenu.style.display = "none";
            }
        });

        menu.style.display = menu.style.display === "block" ? "none" : "block";
    });

    menu.querySelector(".menuPlay").addEventListener("click", function(e) {
        e.stopPropagation();

        let index = getSongItems().indexOf(songItem);

        if (index !== -1) {
            loadSong(index);
        }

        menu.style.display = "none";
    });

    menu.querySelector(".menuRename").addEventListener("click", function(e) {
        e.stopPropagation();

        renameSong(songItem);
        menu.style.display = "none";
    });

    menu.querySelector(".menuDelete").addEventListener("click", async function(e) {
        e.stopPropagation();

        menu.style.display = "none";
        await deleteSong(songItem);
    });
}

async function renameSong(songItem) {
    let nameElement = songItem.querySelector(".songName");

    if (!nameElement) return;

    let oldName = nameElement.textContent;
    let newName = prompt("New song name:", oldName);

    if (newName === null) return;

    newName = newName.trim();

    if (!newName) {
        alert("Song name empty nahi ho sakta.");
        return;
    }

    nameElement.textContent = newName;

    if (songItem.dataset.songType === "static") {
        renamedStaticSongs[songItem.dataset.songSrc] = newName;

        localStorage.setItem(
            "renamedStaticSongs",
            JSON.stringify(renamedStaticSongs)
        );
    } else {
        let id = Number(songItem.dataset.songId);

        if (db && id) {
            let transaction = db.transaction("songs", "readwrite");
            let store = transaction.objectStore("songs");
            let request = store.get(id);

            request.onsuccess = function() {
                let song = request.result;

                if (song) {
                    song.name = newName;
                    store.put(song);
                }
            };
        }

        let added = addedSongs.find(song => Number(song.id) === id);

        if (added) {
            added.name = newName;
        }
    }

    updateBottomSongName();
}

function createStaticSongs() {
    let items = getSongItems();
    let activeSongs = [];

    items.forEach((item, index) => {
        let src = allSongs[index];

        if (!src) return;

        item.dataset.songSrc = src;
        item.dataset.songType = "static";

        if (deletedStaticSongs[src]) {
            item.remove();
            return;
        }

        let nameElement = item.querySelector(".songName");

        if (renamedStaticSongs[src] && nameElement) {
            nameElement.textContent = renamedStaticSongs[src];
        }

        createMenu(item);

        let button = item.querySelector(".playButton");

        if (button) {
            button.addEventListener("click", function(e) {
                e.stopPropagation();

                let songIndex = getSongItems().indexOf(item);

                if (songIndex === currentSongIndex && !audio.paused) {
                    audio.pause();
                } else {
                    loadSong(songIndex);
                }
            });
        }

        let tempAudio = new Audio();

        tempAudio.src = src;

        tempAudio.addEventListener("loadedmetadata", function() {
            let duration = item.querySelector(".duration");

            if (duration) {
                duration.textContent = formatTime(tempAudio.duration);
            }
        });

        activeSongs.push(src);
    });

    songs = activeSongs;
}

function generateRandomCover(songName) {
    let canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 600;

    let ctx = canvas.getContext("2d");

    let colors = [
        ["#ff416c", "#ff4b2b"],
        ["#4776e6", "#8e54e9"],
        ["#00c6ff", "#0072ff"],
        ["#f953c6", "#b91d73"],
        ["#11998e", "#38ef7d"],
        ["#fc4a1a", "#f7b733"],
        ["#654ea3", "#eaafc8"],
        ["#4568dc", "#b06ab3"],
        ["#36d1dc", "#5b86e5"],
        ["#ff9966", "#ff5e62"]
    ];

    let pair = colors[Math.floor(Math.random() * colors.length)];
    let gradient = ctx.createLinearGradient(0, 0, 600, 600);

    gradient.addColorStop(0, pair[0]);
    gradient.addColorStop(1, pair[1]);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 600, 600);

    for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.arc(
            Math.random() * 600,
            Math.random() * 600,
            40 + Math.random() * 120,
            0,
            Math.PI * 2
        );

        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fill();
    }

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "bold 54px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let title = songName.length > 18
        ? songName.substring(0, 18) + "..."
        : songName;

    ctx.fillText(title, 300, 300);

    ctx.font = "bold 22px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText("MY MUSIC", 300, 360);

    return canvas.toDataURL("image/png");
}

function createSongElement(file, id, customName = null) {
    let songItem = document.createElement("div");
    songItem.className = "songItem";

    let objectURL = URL.createObjectURL(file);

    songItem.dataset.songSrc = objectURL;
    songItem.dataset.songType = "dynamic";
    songItem.dataset.songId = String(id);

    let songName = customName || file.name.replace(/\.[^/.]+$/, "");
    let cover = generateRandomCover(songName);

    songItem.innerHTML = `
        <img src="${cover}" alt="Song">
        <span class="songName">${songName}</span>
        <span class="songListPlay">
            <span class="timestamp">
                <span class="currentTime">00:00</span> /
                <span class="duration">00:00</span>
                <i class="fa-solid fa-circle-play playButton"></i>
            </span>
        </span>
    `;

    songItemContainer.appendChild(songItem);

    addedSongs.push({
        id: id,
        name: songName,
        file: file,
        src: objectURL
    });

    songs.push(objectURL);

    createMenu(songItem);

    let button = songItem.querySelector(".playButton");

    button.addEventListener("click", function(e) {
        e.stopPropagation();

        let index = getSongItems().indexOf(songItem);

        if (index === currentSongIndex && !audio.paused) {
            audio.pause();
        } else {
            loadSong(index);
        }
    });

    let tempAudio = new Audio();

    tempAudio.src = objectURL;

    tempAudio.addEventListener("loadedmetadata", function() {
        let duration = songItem.querySelector(".duration");

        if (duration) {
            duration.textContent = formatTime(tempAudio.duration);
        }
    });

    return songItem;
}

async function deleteSong(songItem) {
    let nameElement = songItem.querySelector(".songName");
    let songName = nameElement ? nameElement.textContent : "this song";

    if (!confirm(`"${songName}" Do you really want to delete this?`)) return;

    let items = getSongItems();
    let index = items.indexOf(songItem);

    if (index === -1) return;

    let wasCurrentSong = index === currentSongIndex;

    if (wasCurrentSong) {
        audio.pause();
        audio.src = "";
        audio.load();

        currentSongIndex = -1;
        progressBar.value = 0;
        gif.style.opacity = "0";

        masterPlay.classList.remove("fa-circle-pause");
        masterPlay.classList.add("fa-circle-play");

        bottomSongName.textContent = "No Song Playing";
        bottomSongTime.textContent = "00:00 / 00:00";
    } else if (currentSongIndex > index) {
        currentSongIndex--;
    }

    if (songItem.dataset.songType === "static") {
        let src = songItem.dataset.songSrc;

        deletedStaticSongs[src] = true;

        localStorage.setItem(
            "deletedStaticSongs",
            JSON.stringify(deletedStaticSongs)
        );

        songs = songs.filter(song => song !== src);
    } else {
        let id = Number(songItem.dataset.songId);
        let src = songItem.dataset.songSrc;

        addedSongs = addedSongs.filter(
            song => Number(song.id) !== id
        );

        await deleteSongFromDB(id);

        songs = songs.filter(song => song !== src);

        if (src) {
            URL.revokeObjectURL(src);
        }
    }

    songItem.remove();

    resetButtons();
    resetTimes();

    if (currentSongIndex >= 0) {
        updateBottomSongName();
    }
}

const VIDEO_EXT = /\.(mp4|webm|mkv|mov|avi|m4v|ogv)$/i;
const AUDIO_EXT = /\.(mp3|wav|ogg|oga|aac|m4a|flac|opus|webm)$/i;
const MAX_FAST_DECODE_BYTES = 150 * 1024 * 1024;

function isAudioFile(file) {
    return file.type.startsWith("audio/") || AUDIO_EXT.test(file.name);
}

function isVideoFile(file) {
    return file.type.startsWith("video/") || VIDEO_EXT.test(file.name);
}

function showToast(message) {
    let toast = document.getElementById("uploadToast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "uploadToast";
        toast.style.position = "fixed";
        toast.style.left = "50%";
        toast.style.bottom = "100px";
        toast.style.transform = "translateX(-50%)";
        toast.style.padding = "12px 18px";
        toast.style.background = "#111";
        toast.style.color = "#fff";
        toast.style.borderRadius = "8px";
        toast.style.zIndex = "99999";
        toast.style.fontSize = "14px";
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.display = "block";
}

function hideToast() {
    let toast = document.getElementById("uploadToast");

    if (toast) {
        toast.style.display = "none";
    }
}

function floatToInt16(value) {
    value = Math.max(-1, Math.min(1, value));

    return value < 0
        ? value * 0x8000
        : value * 0x7fff;
}

function writeAscii(view, offset, text) {
    for (let i = 0; i < text.length; i++) {
        view.setUint8(offset + i, text.charCodeAt(i));
    }
}

function pcmToWavBlob(channels, sampleRate) {
    let channelCount = channels.length;
    let length = channels[0].length;

    let buffer = new ArrayBuffer(
        44 + length * channelCount * 2
    );

    let view = new DataView(buffer);

    writeAscii(view, 0, "RIFF");
    view.setUint32(
        4,
        36 + length * channelCount * 2,
        true
    );

    writeAscii(view, 8, "WAVE");
    writeAscii(view, 12, "fmt ");

    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channelCount, true);
    view.setUint32(24, sampleRate, true);

    view.setUint32(
        28,
        sampleRate * channelCount * 2,
        true
    );

    view.setUint16(
        32,
        channelCount * 2,
        true
    );

    view.setUint16(34, 16, true);

    writeAscii(view, 36, "data");

    view.setUint32(
        40,
        length * channelCount * 2,
        true
    );

    let offset = 44;

    for (let i = 0; i < length; i++) {
        for (let channel = 0; channel < channelCount; channel++) {
            view.setInt16(
                offset,
                floatToInt16(channels[channel][i]),
                true
            );

            offset += 2;
        }
    }

    return new Blob([buffer], {
        type: "audio/wav"
    });
}

async function decodeVideoAudio(file) {
    let arrayBuffer = await file.arrayBuffer();
    let AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
        throw new Error("AudioContext supported nahi hai.");
    }

    let context = new AudioContextClass();

    try {
        let audioBuffer =
            await context.decodeAudioData(arrayBuffer);

        let channels = [];

        for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
            channels.push(audioBuffer.getChannelData(i));
        }

        let blob = pcmToWavBlob(
            channels,
            audioBuffer.sampleRate
        );

        await context.close();

        return blob;
    } catch (error) {
        await context.close();
        throw error;
    }
}

function recordVideoAudio(file, onProgress) {
    return new Promise((resolve, reject) => {
        let video = document.createElement("video");
        let objectURL = URL.createObjectURL(file);
        let AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) {
            URL.revokeObjectURL(objectURL);
            reject(new Error("AudioContext supported nahi hai."));
            return;
        }

        let context = new AudioContextClass();
        let source;
        let processor;
        let gain;

        let channelsData = [[], []];
        let sampleRate = 44100;
        let finished = false;

        function cleanup() {
            video.pause();

            try {
                if (source) source.disconnect();
                if (processor) processor.disconnect();
                if (gain) gain.disconnect();
            } catch (error) {}

            URL.revokeObjectURL(objectURL);

            if (context.state !== "closed") {
                context.close().catch(() => {});
            }
        }

        function fail(error) {
            if (finished) return;

            finished = true;
            cleanup();
            reject(error);
        }

        video.src = objectURL;
        video.preload = "auto";
        video.muted = false;
        video.volume = 1;

        video.addEventListener("loadedmetadata", async function() {
            try {
                await context.resume();

                sampleRate = context.sampleRate;

                source = context.createMediaElementSource(video);
                processor = context.createScriptProcessor(4096, 2, 2);
                gain = context.createGain();

                gain.gain.value = 0;

                source.connect(processor);
                processor.connect(gain);
                gain.connect(context.destination);

                processor.onaudioprocess = function(event) {
                    let input = event.inputBuffer;

                    if (input.numberOfChannels === 1) {
                        let data = input.getChannelData(0);

                        for (let i = 0; i < data.length; i++) {
                            channelsData[0].push(data[i]);
                            channelsData[1].push(data[i]);
                        }
                    } else {
                        let left = input.getChannelData(0);
                        let right = input.getChannelData(1);

                        for (let i = 0; i < left.length; i++) {
                            channelsData[0].push(left[i]);
                            channelsData[1].push(right[i]);
                        }
                    }

                    if (video.duration && onProgress) {
                        onProgress(
                            (video.currentTime / video.duration) * 100
                        );
                    }
                };

                video.addEventListener("ended", function() {
                    if (finished) return;

                    finished = true;

                    let length = Math.min(
                        channelsData[0].length,
                        channelsData[1].length
                    );

                    channelsData[0] =
                        new Float32Array(
                            channelsData[0].slice(0, length)
                        );

                    channelsData[1] =
                        new Float32Array(
                            channelsData[1].slice(0, length)
                        );

                    let blob = pcmToWavBlob(
                        channelsData,
                        sampleRate
                    );

                    cleanup();
                    resolve(blob);
                });

                video.addEventListener("error", function() {
                    fail(new Error("Video play nahi ho saki."));
                });

                await video.play();
            } catch (error) {
                fail(error);
            }
        });

        video.addEventListener("error", function() {
            fail(new Error("Video load nahi ho saki."));
        });
    });
}

async function convertVideoToAudio(file) {
    showToast("Video se audio nikala ja raha hai...");

    let blob;

    if (file.size <= MAX_FAST_DECODE_BYTES) {
        try {
            blob = await decodeVideoAudio(file);
        } catch (error) {
            blob = await recordVideoAudio(
                file,
                progress => {
                    showToast(
                        "Video convert ho rahi hai: " +
                        Math.round(progress) +
                        "%"
                    );
                }
            );
        }
    } else {
        blob = await recordVideoAudio(
            file,
            progress => {
                showToast(
                    "Video convert ho rahi hai: " +
                    Math.round(progress) +
                    "%"
                );
            }
        );
    }

    let baseName =
        file.name.replace(/\.[^/.]+$/, "");

    return new File(
        [blob],
        baseName + ".wav",
        {
            type: "audio/wav"
        }
    );
}

songUpload.addEventListener("change", async function() {
    let files = Array.from(this.files);

    for (let file of files) {
        let songFile = null;

        if (isAudioFile(file)) {
            songFile = file;
        } else if (isVideoFile(file)) {
            try {
                songFile = await convertVideoToAudio(file);
            } catch (error) {
                console.log(error);
                hideToast();

                alert(
                    "Is video se audio nahi nikal saki: " +
                    file.name +
                    "\nDobara try karein ya koi doosri video choose karein."
                );

                continue;
            }
        } else {
            continue;
        }

        let id = Date.now() + Math.random();

        await saveSongToDB({
            id: id,
            name: songFile.name,
            file: songFile
        });

        createSongElement(songFile, id);
    }

    hideToast();
    this.value = "";
});

function openDatabase() {
    return new Promise((resolve, reject) => {
        let request =
            indexedDB.open("SpotifyCloneDB", 1);

        request.onupgradeneeded = function(event) {
            let database = event.target.result;

            if (!database.objectStoreNames.contains("songs")) {
                database.createObjectStore("songs", {
                    keyPath: "id"
                });
            }
        };

        request.onsuccess = function(event) {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = function() {
            reject(request.error);
        };
    });
}

function saveSongToDB(song) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database open nahi hai."));
            return;
        }

        let transaction =
            db.transaction("songs", "readwrite");

        let store =
            transaction.objectStore("songs");

        store.put(song);

        transaction.oncomplete = function() {
            resolve();
        };

        transaction.onerror = function() {
            reject(transaction.error);
        };
    });
}

function deleteSongFromDB(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database open nahi hai."));
            return;
        }

        let transaction =
            db.transaction("songs", "readwrite");

        let store =
            transaction.objectStore("songs");

        store.delete(id);

        transaction.oncomplete = function() {
            resolve();
        };

        transaction.onerror = function() {
            reject(transaction.error);
        };
    });
}

function getSavedSongs() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database open nahi hai."));
            return;
        }

        let transaction =
            db.transaction("songs", "readonly");

        let store =
            transaction.objectStore("songs");

        let request = store.getAll();

        request.onsuccess = function() {
            resolve(request.result || []);
        };

        request.onerror = function() {
            reject(request.error);
        };
    });
}

async function loadSavedSongs() {
    let savedSongs = await getSavedSongs();

    for (let savedSong of savedSongs) {
        if (savedSong.file) {
            createSongElement(
                savedSong.file,
                savedSong.id,
                savedSong.name
            );
        }
    }
}

document.addEventListener("click", function() {
    document.querySelectorAll(".songMenu").forEach(menu => {
        menu.style.display = "none";
    });
});

audio.addEventListener("loadedmetadata", function() {
    if (!isFinite(audio.duration)) return;

    bottomSongTime.textContent =
        formatTime(audio.currentTime) +
        " / " +
        formatTime(audio.duration);

    let item = getCurrentSongItem();

    if (item) {
        let duration = item.querySelector(".duration");

        if (duration) {
            duration.textContent =
                formatTime(audio.duration);
        }
    }
});

audio.addEventListener("timeupdate", function() {
    if (!isFinite(audio.duration) || audio.duration === 0) return;

    let progress =
        (audio.currentTime / audio.duration) * 100;

    progressBar.value = progress;

    bottomSongTime.textContent =
        formatTime(audio.currentTime) +
        " / " +
        formatTime(audio.duration);

    let item = getCurrentSongItem();

    if (item) {
        let currentTime =
            item.querySelector(".currentTime");

        if (currentTime) {
            currentTime.textContent =
                formatTime(audio.currentTime);
        }
    }
});

progressBar.addEventListener("input", function() {
    if (!isFinite(audio.duration)) return;

    audio.currentTime =
        (progressBar.value / 100) *
        audio.duration;
});

audio.addEventListener("play", function() {
    masterPlay.classList.remove("fa-circle-play");
    masterPlay.classList.add("fa-circle-pause");

    gif.style.opacity = "1";

    let item = getCurrentSongItem();

    if (item) {
        let button =
            item.querySelector(".playButton");

        if (button) {
            button.classList.remove("fa-circle-play");
            button.classList.add("fa-circle-pause");
        }
    }
});

audio.addEventListener("pause", function() {
    masterPlay.classList.remove("fa-circle-pause");
    masterPlay.classList.add("fa-circle-play");

    gif.style.opacity = "0";

    let item = getCurrentSongItem();

    if (item) {
        let button =
            item.querySelector(".playButton");

        if (button) {
            button.classList.remove("fa-circle-pause");
            button.classList.add("fa-circle-play");
        }
    }
});

masterPlay.addEventListener("click", function() {
    if (currentSongIndex === -1) {
        if (getSongItems().length > 0) {
            loadSong(0);
        }

        return;
    }

    if (audio.paused) {
        audio.play().catch(() => {});
    } else {
        audio.pause();
    }
});

next.addEventListener("click", function() {
    let items = getSongItems();

    if (!items.length) return;

    let nextIndex = currentSongIndex + 1;

    if (nextIndex >= items.length) {
        nextIndex = 0;
    }

    loadSong(nextIndex);
});

previous.addEventListener("click", function() {
    let items = getSongItems();

    if (!items.length) return;

    let previousIndex = currentSongIndex - 1;

    if (previousIndex < 0) {
        previousIndex = items.length - 1;
    }

    loadSong(previousIndex);
});

audio.addEventListener("ended", function() {
    let items = getSongItems();

    if (!items.length) return;

    let nextIndex = currentSongIndex + 1;

    if (nextIndex >= items.length) {
        nextIndex = 0;
    }

    loadSong(nextIndex);
});

audio.addEventListener("error", function() {
    resetButtons();

    masterPlay.classList.remove("fa-circle-pause");
    masterPlay.classList.add("fa-circle-play");

    gif.style.opacity = "0";
});

createStaticSongs();

openDatabase()
    .then(loadSavedSongs)
    .catch(function(error) {
        console.log(error);
    });
