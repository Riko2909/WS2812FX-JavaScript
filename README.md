# WS2812FX-JavaScript
WS2812FX Libary from kitesurfer1404 translated to JavaScript/Typescript

## Init

```typescript
let x = new WS2812FX_Modes(
	{
		leds: 20,
		stripType: "grb",
	},
	100
);

x.setColor1(RED);
x.setColor2(GREEN);
x.setColor3(BLUE);

x.setMode(14);

while (true) {
	x.service();
}
```
