/**
 * Every image on the site comes from this file.
 *
 * To use real images, drop files into /public/images and fill in `src`,
 * e.g. src: "/images/hero-01.jpg". Keep `aspect` (width / height) close to
 * the real file so layouts don't jump. Leave `src` empty to keep the
 * placeholder gradient.
 *
 * Remote URLs also work, but add their host to `images.remotePatterns`
 * in next.config.ts for the DOM (next/image) versions.
 */

export type GalleryItem = {
  id: string;
  src?: string;
  alt: string;
  /** width / height */
  aspect: number;
  caption?: string;
  credit?: string;
  /** artwork details, shown on placards and in the room's inspect panel */
  artist?: string;
  year?: string;
  note?: string;
};

/**
 * SAMPLE CONTENT: public-domain paintings served from Wikimedia Commons, so
 * every section has real art to look at. Swap in your own work any time (and
 * drop the Wikimedia host from next.config.ts when you do).
 */
const commons = (path: string, file: string, thumb = true) =>
  thumb
    ? `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}/${file}/1280px-${file}`
    : `https://upload.wikimedia.org/wikipedia/commons/${path}/${file}`;
const PD = "Public domain, via Wikimedia Commons";
const painted = (artist: string) => `Painting — ${artist}`;

/** Scene 1 — floating 3D frames behind the hero title (6). */
export const heroFrames: GalleryItem[] = [
  {
    id: "img-01",
    src: commons("7/72", "Vilhelm_Hammersh%C3%B8i_%281864-1916%29_-_Interior%2C_Sunlight_on_the_Floor_-_N04509_-_National_Gallery.jpg", false),
    alt: "An empty room with pale walls and a patch of sunlight on the floorboards",
    aspect: 1021 / 1200,
    caption: "Interior, Sunlight on the Floor",
    artist: "Vilhelm Hammershøi",
    year: "1906",
    credit: painted("Vilhelm Hammershøi"),
  },
  {
    id: "img-02",
    src: commons("2/20", "Johannes_Vermeer_-_Het_melkmeisje_-_Google_Art_Project.jpg"),
    alt: "A maid pours milk from a jug by a window, bread on the table before her",
    aspect: 4000 / 4485,
    caption: "The Milkmaid",
    artist: "Johannes Vermeer",
    year: "c. 1658",
    credit: painted("Johannes Vermeer"),
  },
  {
    id: "img-03",
    src: commons("2/26", "Jean-Baptiste_Sim%C3%A9on_Chardin_005.jpg", false),
    alt: "A pyramid of wild strawberries in a basket beside a glass of water and white carnations",
    aspect: 1576 / 1301,
    caption: "Basket of Wild Strawberries",
    artist: "Jean-Siméon Chardin",
    year: "c. 1761",
    credit: painted("Jean-Siméon Chardin"),
  },
  {
    id: "img-04",
    src: commons("1/1b", "Claude_Monet_-_Woman_with_a_Parasol_-_Madame_Monet_and_Her_Son_-_Google_Art_Project.jpg"),
    alt: "A woman with a parasol on a breezy hillside, seen from below against the sky",
    aspect: 6001 / 7455,
    caption: "Woman with a Parasol",
    artist: "Claude Monet",
    year: "1875",
    credit: painted("Claude Monet"),
  },
  {
    id: "img-05",
    src: commons("d/d9", "Joaqu%C3%ADn_Sorolla_y_Bastida_-_Strolling_along_the_Seashore_-_Google_Art_Project.jpg"),
    alt: "Two women in white dresses and veils walk along a bright sunlit shore",
    aspect: 4832 / 4894,
    caption: "Strolling along the Seashore",
    artist: "Joaquín Sorolla",
    year: "1909",
    credit: painted("Joaquín Sorolla"),
  },
  {
    id: "img-06",
    src: commons("7/72", "Hiroshige%2C_Sudden_shower_over_Shin-%C5%8Chashi_bridge_and_Atake%2C_1857.jpg"),
    alt: "Figures hurry across a wooden bridge under slanting lines of rain",
    aspect: 5357 / 8117,
    caption: "Sudden Shower over Shin-Ōhashi Bridge",
    artist: "Utagawa Hiroshige",
    year: "1857",
    credit: painted("Utagawa Hiroshige"),
  },
];

/** Scene 3 — distortion gallery, editorial layout (6). */
export const galleryImages: GalleryItem[] = [
  {
    id: "img-07",
    src: commons("9/9b", "Hammersh%C3%B8i_Dust_motes_dancing.jpg"),
    alt: "Shafts of sunlight fall through a tall window into a bare grey room",
    aspect: 1609 / 1890,
    caption: "Dust Motes Dancing in the Sunbeams — Hammershøi, 1900",
    artist: "Vilhelm Hammershøi",
    year: "1900",
    credit: painted("Vilhelm Hammershøi"),
  },
  {
    id: "img-08",
    src: commons("d/d6", "James_McNeill_Whistler_-_Nocturne_en_bleu_et_or.jpg"),
    alt: "A tall bridge pier in blue night mist over the Thames, fireworks falling in the distance",
    aspect: 1926 / 2584,
    caption: "Nocturne: Blue and Gold — Whistler, c. 1872",
    artist: "James McNeill Whistler",
    year: "c. 1872",
    credit: painted("James McNeill Whistler"),
  },
  {
    id: "img-09",
    src: commons("3/30", "The_Fighting_Temeraire%2C_JMW_Turner%2C_National_Gallery.jpg"),
    alt: "A ghostly warship is towed by a dark tug across a river at a blazing sunset",
    aspect: 5684 / 4223,
    caption: "The Fighting Temeraire — Turner, 1839",
    artist: "J. M. W. Turner",
    year: "1839",
    credit: painted("J. M. W. Turner"),
  },
  {
    id: "img-10",
    src: commons("a/af", "La_Montagne_Sainte-Victoire_vue_de_la_carri%C3%A8re_Bib%C3%A9mus%2C_par_Paul_C%C3%A9zanne.jpg"),
    alt: "A pale mountain rises above ochre quarry rock and green pines",
    aspect: 5508 / 4381,
    caption: "Mont Sainte-Victoire — Cézanne, c. 1897",
    artist: "Paul Cézanne",
    year: "c. 1897",
    credit: painted("Paul Cézanne"),
  },
  {
    id: "img-11",
    src: commons("8/81", "Edgar_Degas_-_The_Ballet_Class_-_Google_Art_Project.jpg"),
    alt: "Young dancers in white tutus gather around an old ballet master in a high studio",
    aspect: 3950 / 4535,
    caption: "The Ballet Class — Degas, 1871–74",
    artist: "Edgar Degas",
    year: "1871–74",
    credit: painted("Edgar Degas"),
  },
  {
    id: "img-12",
    src: commons("5/56", "Vilhelm_Hammershoi_-_Interieur_mit_Rueckenansicht_einer_Frau_-_1903-1904_-_Randers_Kunstmuseum.jpg"),
    alt: "A woman in black seen from behind in a quiet room, a punch bowl on the sideboard",
    aspect: 2470 / 2955,
    caption: "Interior with a Woman Seen from the Back — Hammershøi, 1903–04",
    artist: "Vilhelm Hammershøi",
    year: "1903–04",
    credit: painted("Vilhelm Hammershøi"),
  },
];

/** Scene 4 — horizontal strip (8). */
export const stripFrames: GalleryItem[] = [
  {
    id: "img-13",
    src: commons("6/68", "Vincent_van_Gogh_-_Almond_blossom_-_Google_Art_Project.jpg"),
    alt: "White almond blossom on branches against a turquoise sky",
    aspect: 3139 / 2480,
    caption: "Almond Blossom",
    artist: "Vincent van Gogh",
    year: "1890",
    credit: painted("Vincent van Gogh"),
  },
  {
    id: "img-14",
    src: commons("8/89", "Claude_Monet_-_Poppy_Field_-_Google_Art_Project.jpg"),
    alt: "A woman and child walk through a hillside of red poppies",
    aspect: 5586 / 4258,
    caption: "Poppies",
    artist: "Claude Monet",
    year: "1873",
    credit: painted("Claude Monet"),
  },
  {
    id: "img-15",
    src: commons("2/25", "Katsushika_Hokusai_-_Fine_Wind%2C_Clear_Morning_%28Gaif%C5%AB_kaisei%29_-_Google_Art_Project.jpg"),
    alt: "Mount Fuji glows red under a sky of small white clouds",
    aspect: 5803 / 3918,
    caption: "Red Fuji",
    artist: "Katsushika Hokusai",
    year: "c. 1831",
    credit: painted("Katsushika Hokusai"),
  },
  {
    id: "img-16",
    src: commons("e/ed", "View_of_Delft%2C_by_Johannes_Vermeer.jpg"),
    alt: "A Dutch town across still water under a wide cloudy sky",
    aspect: 6000 / 4982,
    caption: "Delft",
    artist: "Johannes Vermeer",
    year: "c. 1661",
    credit: painted("Johannes Vermeer"),
  },
  {
    id: "img-17",
    src: commons("8/8d", "Pierre-Auguste_Renoir_-_Luncheon_of_the_Boating_Party_-_Google_Art_Project.jpg"),
    alt: "Friends linger over lunch on a riverside balcony shaded by a striped awning",
    aspect: 9025 / 6684,
    caption: "Luncheon",
    artist: "Pierre-Auguste Renoir",
    year: "1881",
    credit: painted("Pierre-Auguste Renoir"),
  },
  {
    id: "img-18",
    src: commons("1/17", "Gustave_Caillebotte_-_Paris_Street%3B_Rainy_Day_-_Google_Art_Project.jpg"),
    alt: "Couples with umbrellas cross a wet Paris intersection",
    aspect: 5982 / 4531,
    caption: "Rain",
    artist: "Gustave Caillebotte",
    year: "1877",
    credit: painted("Gustave Caillebotte"),
  },
  {
    id: "img-19",
    src: commons("d/d8", "Pieter_Bruegel_the_Elder_-_Hunters_in_the_Snow_%28Winter%29_-_Google_Art_Project.jpg"),
    alt: "Hunters and dogs return over a snowy hill above frozen ponds full of skaters",
    aspect: 6819 / 4853,
    caption: "Winter",
    artist: "Pieter Bruegel the Elder",
    year: "1565",
    credit: painted("Pieter Bruegel the Elder"),
  },
  {
    id: "img-20",
    src: commons("1/15", "Vincent_van_Gogh_-_Wheat_Field_with_Cypresses_%28National_Gallery_version%29.jpg"),
    alt: "A golden wheat field rolls toward dark cypresses under swirling clouds",
    aspect: 10882 / 8653,
    caption: "Wheat",
    artist: "Vincent van Gogh",
    year: "1889",
    credit: painted("Vincent van Gogh"),
  },
];

/**
 * Everything hung in the walkable 3D room, in hanging order:
 * centre wall (front), left/right walls front→back, centre wall (back),
 * end wall (left, centre, right), entrance wall (left, right).
 *
 * SAMPLE CONTENT: public-domain paintings served from Wikimedia Commons,
 * so the room has real art to look at. Swap for your own works any time.
 */

export const roomExhibit: GalleryItem[] = [
  {
    id: "art-starry-night",
    src: commons("e/ea", "Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg"),
    alt: "A swirling night sky over a sleeping village, a dark cypress in the foreground",
    aspect: 44567 / 35291,
    caption: "The Starry Night",
    artist: "Vincent van Gogh",
    year: "1889",
    note: "Painted from memory of the view from his window at the asylum in Saint-Rémy — the sky moves more than anything on the ground.",
    credit: PD,
  },
  {
    id: "art-pearl-earring",
    src: commons("d/d7", "Meisje_met_de_parel.jpg"),
    alt: "A girl in a blue and yellow turban looks over her shoulder, a pearl at her ear",
    aspect: 4095 / 4794,
    caption: "Girl with a Pearl Earring",
    artist: "Johannes Vermeer",
    year: "c. 1665",
    note: "Not a portrait but a tronie — a study of a face and a costume. The pearl is just two strokes of paint.",
    credit: PD,
  },
  {
    id: "art-impression-sunrise",
    src: commons("5/54", "Claude_Monet%2C_Impression%2C_soleil_levant.jpg", false),
    alt: "An orange sun rising over a hazy blue harbour with small boats",
    aspect: 1600 / 1245,
    caption: "Impression, Sunrise",
    artist: "Claude Monet",
    year: "1872",
    note: "The harbour at Le Havre in morning fog. A critic mocked its title, and gave a whole movement its name.",
    credit: PD,
  },
  {
    id: "art-great-wave",
    src: commons("a/a5", "Tsunami_by_hokusai_19th_century.jpg"),
    alt: "A towering blue wave curls over three boats, Mount Fuji small in the distance",
    aspect: 3859 / 2594,
    caption: "The Great Wave off Kanagawa",
    artist: "Katsushika Hokusai",
    year: "c. 1831",
    note: "A woodblock print, made to be printed thousands of times. Fuji, the eternal mountain, is the smallest thing in it.",
    credit: PD,
  },
  {
    id: "art-scream",
    src: commons(
      "c/c5",
      "Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg",
    ),
    alt: "A figure on a bridge clutches its face beneath a blood-red sky",
    aspect: 3223 / 4000,
    caption: "The Scream",
    artist: "Edvard Munch",
    year: "1893",
    note: "Munch described sensing an infinite scream passing through nature as the sky turned red over the fjord.",
    credit: PD,
  },
  {
    id: "art-grande-jatte",
    src: commons("b/b7", "Georges_Seurat_-_A_Sunday_on_La_Grande_Jatte_--_1884_-_Google_Art_Project.jpg"),
    alt: "Parisians relax in the sun on a river island, painted in tiny dots of colour",
    aspect: 30000 / 19970,
    caption: "A Sunday on La Grande Jatte",
    artist: "Georges Seurat",
    year: "1884–86",
    note: "Two years of small dots of pure colour that only mix in your eye. Step back and it settles into a quiet afternoon.",
    credit: PD,
  },
  {
    id: "art-lady-of-shalott",
    src: commons("1/1e", "John_William_Waterhouse_-_The_Lady_of_Shalott_-_Google_Art_Project.jpg"),
    alt: "A woman in white sits in a boat drifting on a dark river among reeds",
    aspect: 4180 / 3208,
    caption: "The Lady of Shalott",
    artist: "John William Waterhouse",
    year: "1888",
    note: "From Tennyson's poem: she leaves her tower and drifts toward Camelot as the candles on the boat burn down.",
    credit: PD,
  },
  {
    id: "art-composition-vii",
    src: commons("b/b4", "Vassily_Kandinsky%2C_1913_-_Composition_7.jpg", false),
    alt: "An explosive abstract tangle of colour, line and shape",
    aspect: 1000 / 657,
    caption: "Composition VII",
    artist: "Wassily Kandinsky",
    year: "1913",
    note: "Painted in about four days after months of studies. Kandinsky thought of colour the way a composer thinks of sound.",
    credit: PD,
  },
  {
    id: "art-wanderer",
    src: commons("b/b9", "Caspar_David_Friedrich_-_Wanderer_above_the_sea_of_fog.jpg"),
    alt: "A man in a dark coat stands on a rocky peak, looking out over a sea of fog",
    aspect: 2327 / 2980,
    caption: "Wanderer above the Sea of Fog",
    artist: "Caspar David Friedrich",
    year: "c. 1818",
    note: "We only see his back, so we stand where he stands. The mist hides more than it shows.",
    credit: PD,
  },
  {
    id: "art-birth-of-venus",
    src: commons("0/0b", "Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg"),
    alt: "Venus rises from the sea on a scallop shell, blown ashore by the winds",
    aspect: 30000 / 18840,
    caption: "The Birth of Venus",
    artist: "Sandro Botticelli",
    year: "c. 1485",
    note: "Painted on canvas when most work was on wood panels. The goddess arrives on a shell, already perfectly still.",
    credit: PD,
  },
  {
    id: "art-sunflowers",
    src: commons("9/9d", "Vincent_van_Gogh_-_Sunflowers_-_VGM_F458.jpg"),
    alt: "A vase of sunflowers in every stage of bloom against a yellow wall",
    aspect: 3224 / 4226,
    caption: "Sunflowers",
    artist: "Vincent van Gogh",
    year: "1889",
    note: "One of several repetitions he made of the series — yellow on yellow, to decorate a room for a friend.",
    credit: PD,
  },
  {
    id: "art-the-kiss",
    src: commons("f/f3", "Gustav_Klimt_016.jpg", false),
    alt: "Two lovers embrace, wrapped in robes of gold patterns, on a flowered meadow",
    aspect: 1079 / 1080,
    caption: "The Kiss",
    artist: "Gustav Klimt",
    year: "1907–08",
    note: "Oil with layers of real gold leaf. His patterns are hard-edged rectangles, hers are soft circles and flowers.",
    credit: PD,
  },
  {
    id: "art-water-lilies",
    src: commons("a/aa", "Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg"),
    alt: "Pink water lilies float on a pond that reflects the sky",
    aspect: 2342 / 2250,
    caption: "Water Lilies",
    artist: "Claude Monet",
    year: "1906",
    note: "No horizon and no shore: only the surface of his pond at Giverny, with the sky upside down in it.",
    credit: PD,
  },
];

/** Scene 6 — full-bleed image behind the card (1). */
export const featureImage: GalleryItem = {
  id: "img-26",
  src: commons("7/78", "Claude_Monet_-_The_Magpie_-_Google_Art_Project.jpg"),
  alt: "A magpie perched on a gate in a snowy field, winter sun casting blue shadows",
  aspect: 4289 / 2909,
  caption: "The Magpie",
  artist: "Claude Monet",
  year: "1868–69",
  credit: painted("Claude Monet"),
};

/** Everything, in page order. The outro credits are built from this. */
export const gallery: GalleryItem[] = [
  ...heroFrames,
  ...galleryImages,
  ...stripFrames,
  ...roomExhibit.map((item) => ({ ...item, credit: item.artist ? painted(item.artist) : item.credit })),
  featureImage,
];
