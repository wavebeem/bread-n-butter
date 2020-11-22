import Color from "../examples/color";
import { snapTest } from "./util";

test("hex color", () => {
  snapTest(Color, "#fff");
  snapTest(Color, "#000000");
  snapTest(Color, "#729fcf");
  snapTest(Color, "#888888");
  snapTest(Color, "#FfFfFf");

  snapTest(Color, "#00aa");
  snapTest(Color, "#00aa0");
  snapTest(Color, "#abcXYZ");
});

test("rgb color", () => {
  snapTest(Color, "rgb(47, 0, 0)");
  snapTest(Color, "rgb(255,0,0)");
  snapTest(Color, "rgb( 128,1,10 )");
  snapTest(Color, "rgb( 47 , 9 , 99 )");

  snapTest(Color, "rgb( 47 , 9 , 99, 1 )");
  snapTest(Color, "rgb( 1 )");
  snapTest(Color, "rgb( )");
});

test("rgba color", () => {
  snapTest(Color, "rgba(47, 0, 0, 1)");
  snapTest(Color, "rgba(255,0,0, 0.5)");
  snapTest(Color, "rgba( 128,1,10, 0 )");
  snapTest(Color, "rgba( 47 , 9 , 99, 0.05 )");

  snapTest(Color, "rgba( 1, 2, 3 )");
  snapTest(Color, "rgba( 1 2 3 )");
  snapTest(Color, "rgba( 0 )");
  snapTest(Color, "rgba( )");
});
