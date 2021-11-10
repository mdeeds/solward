import * as Tone from "tone";

type StartCallback = () => void;

export class Audio {
  private sos: Tone.Player;
  private station: Tone.Player;
  private constructor() {
  }

  static async make(): Promise<Audio> {
    const body = document.querySelector('body');
    const text = document.createElement('span');
    text.innerText = " - - - Solward Hope - - - ";
    text.style.setProperty('border', 'outset');

    body.appendChild(text);

    return new Promise<Audio>((resolve, reject) => {
      body.addEventListener('click', async () => {
        await Tone.start();
        const a = new Audio();
        a.sos = await a.getData('audio/player-1.mp3');
        a.station = await a.getData('audio/station.mp3')
        // a.play(a.sos);
        a.noise();
        resolve(a);
      });
    });
  }

  async getData(url: string): Promise<Tone.Player> {
    return new Promise<Tone.Player>((resolve, reject) => {
      const buffer = new Tone.Player(url,
        () => { resolve(buffer) }
      )
    });
  }

  noise() {
    const noise = new Tone.Noise("white").start();

    const sp = new URL(document.URL).searchParams;
    const q = sp.get('q') ? parseFloat(sp.get('q')) : 1;
    const g = sp.get('g') ? parseFloat(sp.get('g')) : 120;
    const f = sp.get('f') ? parseFloat(sp.get('f')) : 550;
    const s = sp.get('s') ? parseFloat(sp.get('s')) : 1.5;

    const signalGain = new Tone.Gain(s);
    const stationGain = new Tone.Gain(7);
    const noiseGain = new Tone.Gain(1.0);
    const lowFilter = new Tone.Filter(
      { frequency: 20000, type: 'lowpass', rolloff: -96, Q: 3 });
    const highFilter = new Tone.Filter(
      { frequency: 20, type: 'highpass', rolloff: -96, Q: 3 });

    this.sos.connect(signalGain);
    this.station.connect(stationGain);
    noise.connect(noiseGain);
    noiseGain.connect(lowFilter);
    signalGain.connect(lowFilter);
    stationGain.connect(lowFilter);
    lowFilter.connect(highFilter);
    highFilter.toDestination();

    noise.start();
    this.sos.start(Tone.now() + 2);
    this.station.start(Tone.now() + 2);

    lowFilter.Q.linearRampToValueAtTime(q, Tone.now() + 15);
    highFilter.Q.linearRampToValueAtTime(q, Tone.now() + 15);

    lowFilter.frequency.exponentialRampTo(1200, 10, Tone.now() + 3);
    highFilter.frequency.exponentialRampTo(200, 10, Tone.now() + 10);
    noiseGain.gain.linearRampTo(0.1, 20, Tone.now() + 2);
  }

  play(buffer: AudioBuffer) {
    const audioNode = Tone.getContext().createBufferSource();
    audioNode.buffer = buffer;
    const ctx: AudioContext = Tone.getContext().rawContext as AudioContext;
    audioNode.connect(ctx.destination);
    const nowAudioTime = Tone.getContext().currentTime;
    audioNode.start(nowAudioTime);
  }

}