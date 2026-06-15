declare namespace kakao {
  namespace maps {
    class LatLng {
      constructor(lat: number, lng: number);
    }

    class Map {
      constructor(container: HTMLElement, options: { center: LatLng; level: number });
      setCenter(latlng: LatLng): void;
      setLevel(level: number): void;
      addControl(control: ZoomControl, position: ControlPosition): void;
      relayout(): void;
    }

    class Marker {
      constructor(options: { position: LatLng; map: Map });
      setPosition(position: LatLng): void;
    }

    class ZoomControl {}

    enum ControlPosition {
      RIGHT = 1,
    }

    function load(callback: () => void): void;
  }
}

interface Window {
  kakao: typeof kakao;
}
