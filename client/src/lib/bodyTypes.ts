// Photoreal body-type mannequins for the size advisor (cropped from the
// supplied reference grids). bias shifts the recommended size by build.
export type Gender = "male" | "female";
export type BodyType = { id: string; label: string; img: string; bias: number };

export const BODY_TYPES: Record<Gender, BodyType[]> = {
  male: [
    { id: "m-slim", label: "Slim", img: "/bodytypes/male/01-slim.png", bias: -1 },
    { id: "m-average", label: "Average", img: "/bodytypes/male/02-average.png", bias: 0 },
    { id: "m-athletic", label: "Athletic", img: "/bodytypes/male/03-athletic.png", bias: 0 },
    { id: "m-stocky", label: "Stocky", img: "/bodytypes/male/04-stocky.png", bias: 1 },
    { id: "m-plus", label: "Plus-Size", img: "/bodytypes/male/05-plus-size.png", bias: 2 },
    { id: "m-tall-ath", label: "Tall · Athletic", img: "/bodytypes/male/06-tall-athletic.png", bias: 0 },
    { id: "m-short-stocky", label: "Short · Stocky", img: "/bodytypes/male/07-short-stocky.png", bias: 1 },
    { id: "m-heavy", label: "Heavy-Set", img: "/bodytypes/male/08-heavy-set.png", bias: 2 },
    { id: "m-muscled", label: "Muscled", img: "/bodytypes/male/09-muscled.png", bias: 1 },
    { id: "m-defined", label: "Defined", img: "/bodytypes/male/10-defined.png", bias: 0 },
  ],
  female: [
    { id: "f-slim", label: "Slim", img: "/bodytypes/female/01-slim.png", bias: -1 },
    { id: "f-athletic", label: "Athletic", img: "/bodytypes/female/02-athletic.png", bias: 0 },
    { id: "f-curvy", label: "Curvy", img: "/bodytypes/female/03-curvy.png", bias: 1 },
    { id: "f-full-ath", label: "Full Athletic", img: "/bodytypes/female/04-full-athletic.png", bias: 0 },
    { id: "f-plus", label: "Plus-Size", img: "/bodytypes/female/05-plus-size.png", bias: 2 },
    { id: "f-def-slim", label: "Defined Slim", img: "/bodytypes/female/06-defined-slim.png", bias: -1 },
    { id: "f-ath-fit", label: "Athletic-Fit", img: "/bodytypes/female/07-athletic-fit.png", bias: 0 },
    { id: "f-def-curvy", label: "Defined Curvy", img: "/bodytypes/female/08-defined-curvy.png", bias: 1 },
    { id: "f-power", label: "Power Athletic", img: "/bodytypes/female/09-power-athletic.png", bias: 1 },
    { id: "f-def-plus", label: "Defined Plus", img: "/bodytypes/female/10-defined-plus.png", bias: 2 },
  ],
};
