import success from './sucess.mp3';
const audio = () => {
  const playAudio = () => {
    const audio = new Audio(success);
    audio.play();
  };
  playAudio();
};

export default audio;
