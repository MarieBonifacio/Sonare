import { useEffect, useRef, useState } from 'react';

export type MidiStatus =
  | 'unavailable'
  | 'waiting'
  | 'connected'
  | 'disconnected';

interface UseMidiReturn {
  status: MidiStatus;
  deviceName: string | null;
}

export const useMidi = (
  onNoteOn: (midiNote: number) => void,
): UseMidiReturn => {
  const [status, setStatus] = useState<MidiStatus>('waiting');
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const onNoteOnRef = useRef(onNoteOn);
  onNoteOnRef.current = onNoteOn;

  useEffect(() => {
    if (!('requestMIDIAccess' in navigator)) {
      setStatus('unavailable');
      return;
    }

    let midiAccess: MIDIAccess | null = null;
    const listeners: Array<{ input: MIDIInput; handler: EventListener }> = [];

    const handleMessage = (event: Event) => {
      const midi = event as MIDIMessageEvent;
      if (!midi.data) return;
      const statusByte = midi.data[0];
      const note = midi.data[1];
      const velocity = midi.data[2];
      // Note On : status 0x9x, velocity > 0
      if ((statusByte & 0xf0) === 0x90 && velocity > 0) {
        onNoteOnRef.current(note);
      }
    };

    const connectInputs = (access: MIDIAccess) => {
      listeners.forEach(({ input, handler }) =>
        input.removeEventListener('midimessage', handler),
      );
      listeners.length = 0;

      const inputs = Array.from(access.inputs.values());
      if (inputs.length > 0) {
        setStatus('connected');
        setDeviceName(inputs[0].name ?? 'Appareil MIDI');
        inputs.forEach((input) => {
          input.addEventListener('midimessage', handleMessage);
          listeners.push({ input, handler: handleMessage });
        });
      } else {
        setStatus('disconnected');
        setDeviceName(null);
      }
    };

    navigator
      .requestMIDIAccess()
      .then((access) => {
        midiAccess = access;
        connectInputs(access);
        access.onstatechange = () => connectInputs(access);
      })
      .catch(() => setStatus('unavailable'));

    return () => {
      listeners.forEach(({ input, handler }) =>
        input.removeEventListener('midimessage', handler),
      );
      if (midiAccess) midiAccess.onstatechange = null;
    };
  }, []);

  return { status, deviceName };
};
