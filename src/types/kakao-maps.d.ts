declare namespace kakao {
  namespace maps {
    class LatLng {
      constructor(lat: number, lng: number);
    }

    class Map {
      constructor(container: HTMLElement, options: { center: LatLng; level: number; mapTypeId?: MapTypeId });
      setCenter(latlng: LatLng): void;
      setLevel(level: number): void;
      setMapTypeId(mapTypeId: MapTypeId): void;
      addControl(control: ZoomControl, position: ControlPosition): void;
      relayout(): void;
      getProjection(): MapProjection;
    }

    interface MapProjection {
      containerPointFromCoords(latlng: LatLng): { x: number; y: number };
    }

    namespace event {
      function addListener(
        target: Map,
        type: string,
        handler: () => void,
      ): void;
    }

    class Marker {
      constructor(options: { position: LatLng; map: Map });
      setPosition(position: LatLng): void;
    }

    class Circle {
      constructor(options: {
        center: LatLng;
        radius: number;
        strokeWeight?: number;
        strokeColor?: string;
        strokeOpacity?: number;
        strokeStyle?: string;
        fillColor?: string;
        fillOpacity?: number;
        map?: Map;
      });
      setMap(map: Map | null): void;
      setOptions(options: { center?: LatLng; radius?: number }): void;
    }

    class ZoomControl {}

    enum ControlPosition {
      RIGHT = 1,
    }

    enum MapTypeId {
      ROADMAP = 1,
      SKYVIEW = 2,
      HYBRID = 3,
    }

    function load(callback: () => void): void;
  }
}

interface Window {
  kakao: typeof kakao;
}
