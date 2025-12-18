interface CthulhuMarkerProps {
  size?: number;
}

export function CthulhuMarker({ size = 24 }: CthulhuMarkerProps) {
  return (
    <div
      className="flex items-center justify-center rounded-full bg-purple-900 border-2 border-purple-400 text-purple-200 font-bold shadow-lg"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.55,
      }}
    >
      H
    </div>
  );
}
