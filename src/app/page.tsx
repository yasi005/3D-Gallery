import Preloader from "@/components/Preloader";
import Cursor from "@/components/Cursor";
import TopBar from "@/components/TopBar";
import Hero from "@/components/sections/Hero";
import Statement from "@/components/sections/Statement";
import Gallery from "@/components/sections/Gallery";
import HorizontalStrip from "@/components/sections/HorizontalStrip";
import Room from "@/components/sections/Room";
import CardOverImage from "@/components/sections/CardOverImage";
import Outro from "@/components/sections/Outro";
import SceneLoader from "@/webgl/SceneLoader";

export default function Home() {
  return (
    <>
      <noscript>
        <style>{`html.is-loading{overflow:auto}[role="status"]{display:none}`}</style>
      </noscript>
      <Preloader />
      <SceneLoader />
      <TopBar />
      <main id="top">
        <Hero />
        <Statement />
        <Gallery />
        <HorizontalStrip />
        <Room />
        <CardOverImage />
        <Outro />
      </main>
      <Cursor />
    </>
  );
}
