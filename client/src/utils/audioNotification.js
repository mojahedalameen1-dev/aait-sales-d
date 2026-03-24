/**
 * Utility to play soft, premium UI notification sounds using Web Audio API.
 * Avoids the need for external MP3/WAV files.
 */

const playChime = (type = 'mention') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const context = new AudioContext();
    const now = context.currentTime;

    if (type === 'mention') {
      // Modern "Ping" sound for Mentions (Two-tone high pitch)
      const osc = context.createOscillator();
      const gain = context.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.1); // E6

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      osc.connect(gain);
      gain.connect(context.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'success') {
       // Warm "Chime" for Success/General (Low to high)
       const osc = context.createOscillator();
       const gain = context.createGain();
 
       osc.type = 'sine';
       osc.frequency.setValueAtTime(440, now); // A4
       osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
 
       gain.gain.setValueAtTime(0, now);
       gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
       gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
 
       osc.connect(gain);
       gain.connect(context.destination);
 
       osc.start(now);
       osc.stop(now + 0.8);
    }
  } catch (err) {
    console.warn('Audio feedback blocked by browser or failed:', err);
  }
};

export default playChime;
