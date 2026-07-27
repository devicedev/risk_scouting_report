import styles from "./DateRangeSlider.module.css";

type Props = {
  min: number;
  max: number;
  startValue: number;
  endValue: number;
  onStartChange: (value: number) => void;
  onEndChange: (value: number) => void;
  onMouseDown?: () => void;
  onMouseUp?: () => void;
};

export default function RangeInputs({
  min,
  max,
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  onMouseDown,
  onMouseUp,
}: Props) {
  const handleStartChange = (value: number) => {
    // Не даем start стать больше end
    const newStart = Math.min(value, endValue);
    onStartChange(newStart);
  };

  const handleEndChange = (value: number) => {
    // Не даем end стать меньше start
    const newEnd = Math.max(value, startValue);
    onEndChange(newEnd);
  };

  return (
    <>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={startValue}
        onChange={(e) => handleStartChange(Number(e.target.value))}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        className={styles.slider}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "12px",
          zIndex: startValue > endValue ? 5 : 4,
        }}
      />

      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={endValue}
        onChange={(e) => handleEndChange(Number(e.target.value))}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        className={styles.slider}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "12px",
          zIndex: endValue < startValue ? 5 : 4,
        }}
      />
    </>
  );
}
