import ws281x, { LEDConfig } from "rpi-ws281x";

const RED = 0xff0000;
const GREEN = 0x00ff00;
const BLUE = 0x0000ff;
const WHITE = 0xffffff;
const BLACK = 0x000000;
const YELLOW = 0xffff00;
const CYAN = 0x00ffff;
const MAGENTA = 0xff00ff;
const PURPLE = 0x400080;
const ORANGE = 0xff3000;
const PINK = 0xff1493;
const GRAY = 0x101010;

const SPEED_MIN = 10;
const SPEED_MAX = 2000;
const REVERSE = 0b10000000;

//TODO: Doesnt work
const IS_REVERSE = ((REVERSE - 1) & REVERSE) == REVERSE;

interface Segment {
	aux_param: any;
	colors: Uint32Array;
	speed: number;
	length: number;
	counter_mode_call: number;
	counter_mode_step: number;
	running: boolean;
	triggered: boolean;
	next_time: number;
	aux_param3: number;
	brightness: number;
}

//TODO: Variablen auf uint8, 16, 32 umwandeln!
class WS2812FX_Modes {
	/**
	 * Adafruit functions
	 * @brief   An 8-bit integer sine wave function, not directly compatible
	 *       	with standard trigonometric units like radians or degrees.
	 * @param   x Input angle, 0-255; 256 would loop back to zero, completing
	 *          the circle (equivalent to 360 degrees or 2 pi radians).
	 *          One can therefore use an unsigned 8-bit variable and simply
	 *          add or subtract, allowing it to overflow/underflow and it
	 *          still does the expected contiguous thing.
	 * @return  Sine result, 0 to 255, or -128 to +127 if type-converted to
	 *          a signed int8_t, but you'll most likely want unsigned as this
	 *          output is often used for pixel brightness in animation effects.
	 */
	public sine8(x: number): number {
		let test = new Uint8Array([x]);

		let NeoPixelSineTable = new Uint8Array([
			128,
			131,
			134,
			137,
			140,
			143,
			146,
			149,
			152,
			155,
			158,
			162,
			165,
			167,
			170,
			173,
			176,
			179,
			182,
			185,
			188,
			190,
			193,
			196,
			198,
			201,
			203,
			206,
			208,
			211,
			213,
			215,
			218,
			220,
			222,
			224,
			226,
			228,
			230,
			232,
			234,
			235,
			237,
			238,
			240,
			241,
			243,
			244,
			245,
			246,
			248,
			249,
			250,
			250,
			251,
			252,
			253,
			253,
			254,
			254,
			254,
			255,
			255,
			255,
			255,
			255,
			255,
			255,
			254,
			254,
			254,
			253,
			253,
			252,
			251,
			250,
			250,
			249,
			248,
			246,
			245,
			244,
			243,
			241,
			240,
			238,
			237,
			235,
			234,
			232,
			230,
			228,
			226,
			224,
			222,
			220,
			218,
			215,
			213,
			211,
			208,
			206,
			203,
			201,
			198,
			196,
			193,
			190,
			188,
			185,
			182,
			179,
			176,
			173,
			170,
			167,
			165,
			162,
			158,
			155,
			152,
			149,
			146,
			143,
			140,
			137,
			134,
			131,
			128,
			124,
			121,
			118,
			115,
			112,
			109,
			106,
			103,
			100,
			97,
			93,
			90,
			88,
			85,
			82,
			79,
			76,
			73,
			70,
			67,
			65,
			62,
			59,
			57,
			54,
			52,
			49,
			47,
			44,
			42,
			40,
			37,
			35,
			33,
			31,
			29,
			27,
			25,
			23,
			21,
			20,
			18,
			17,
			15,
			14,
			12,
			11,
			10,
			9,
			7,
			6,
			5,
			5,
			4,
			3,
			2,
			2,
			1,
			1,
			1,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			1,
			1,
			1,
			2,
			2,
			3,
			4,
			5,
			5,
			6,
			7,
			9,
			10,
			11,
			12,
			14,
			15,
			17,
			18,
			20,
			21,
			23,
			25,
			27,
			29,
			31,
			33,
			35,
			37,
			40,
			42,
			44,
			47,
			49,
			52,
			54,
			57,
			59,
			62,
			65,
			67,
			70,
			73,
			76,
			79,
			82,
			85,
			88,
			90,
			93,
			97,
			100,
			103,
			106,
			109,
			112,
			115,
			118,
			121,
			124,
		]);

		return NeoPixelSineTable[test[0]];
	}

	private mode: any = this.mode_static;

	private _seg: Segment = {
		colors: new Uint32Array(3),
		length: 20,
		speed: 600,
		counter_mode_call: 0,
		counter_mode_step: 0,
		running: true,
		triggered: false,
		next_time: 0,
		aux_param: 0,
		aux_param3: 0,
		brightness: 255,
	};
	private _pixels: Uint32Array;

	private _rand16seed: Uint16Array;

	constructor(config: LEDConfig, speed: number) {
		this._seg.length = config.leds;
		this._seg.speed = speed;
		this._pixels = new Uint32Array(config.leds);
		this._rand16seed = new Uint16Array([Math.random() * 100]);

		ws281x.configure(config);
	}

	public service(): void {
		if (this._seg.running || this._seg.triggered) {
			let now: number = Date.now(); // Be aware, millis() rolls over every 49 days
			let doShow: boolean = false;

			if (now > this._seg.next_time || this._seg.triggered) {
				doShow = true;
				this._seg.next_time = now + Math.max(this.mode(), SPEED_MIN);
				this._seg.counter_mode_call++;

				ws281x.render(this._pixels);
			}

			this._seg.triggered = false;
		}
	}

	public reset(): void {
		ws281x.reset();
	}

	public setColor1(color: number) {
		this._seg.colors[0] = color;
	}
	public setColor2(color: number) {
		this._seg.colors[1] = color;
	}
	public setColor3(color: number) {
		this._seg.colors[2] = color;
	}

	public setSpeed(speed: number) {
		this._seg.speed = speed;
	}

	public setStripLength(length: number) {
		this._seg.length = length;
	}

	public setBrightness(brightness: number) {
		this._seg.brightness = brightness;
	}

	public effectSelector(effect: number) {
		switch (effect) {
			case 0:
				return this.mode_static;
			case 1:
				return this.mode_blink;
			case 2:
				return this.mode_breath;
			case 3:
				return this.mode_color_wipe;
			case 4:
				return this.mode_color_wipe_inv;
			case 5:
				return this.mode_color_wipe_rev;
			case 6:
				return this.mode_color_wipe_rev_inv;
			case 7:
				return this.mode_color_wipe_random;
			case 8:
				return this.mode_random_color;
			case 9:
				return this.mode_single_dynamic;
			case 10:
				return this.mode_multi_dynamic;
			case 11:
				return this.mode_rainbow;
			case 12:
				return this.mode_rainbow_cycle;
			case 13:
				return this.mode_scan;
			case 14:
				return this.mode_dual_scan;
			case 15:
				return this.mode_fade;
			case 16:
				return this.mode_theater_chase;
			case 17:
				return this.mode_theater_chase_rainbow;
			case 18:
				return this.mode_running_lights;
			case 19:
				return this.mode_twinkle;
			case 20:
				return this.mode_twinkle_random;
			case 21:
				return this.twinkle_fade;
			case 22:
				return this.mode_twinkle_fade_random;
			case 23:
				return this.mode_sparkle;
			case 24:
				return this.mode_flash_sparkle;
			case 25:
				return this.mode_hyper_sparkle;
			case 26:
				return this.mode_strobe;
			case 27:
				return this.mode_strobe_rainbow;
			case 28:
				return this.mode_multi_strobe;
			case 29:
				return this.mode_blink_rainbow;
			case 30:
				return this.mode_chase_white;
			case 31:
				return this.mode_chase_color;
			case 32:
				return this.mode_chase_random;
			case 33:
				return this.mode_chase_rainbow;
			case 34:
				return this.chase_flash;
			case 35:
				return this.mode_chase_flash_random;
			case 36:
				return this.mode_chase_rainbow_white;
			case 37:
				return this.mode_chase_blackout;
			case 38:
				return this.mode_chase_blackout_rainbow;
			case 39:
				return this.mode_color_sweep_random;
			case 40:
				return this.mode_running_color;
			case 41:
				return this.mode_running_red_blue;
			case 42:
				return this.mode_running_random;
			case 43:
				return this.mode_larson_scanner;
			case 44:
				return this.mode_comet;
			case 45:
				return this.mode_fireworks;
			case 46:
				return this.mode_fireworks_random;
			case 47:
				return this.mode_merry_christmas;
			case 48:
				return this.mode_fire_flicker;
			case 49:
				return this.mode_fire_flicker_soft;
			case 50:
				return this.mode_fire_flicker_intense;
			case 51:
				return this.mode_circus_combustus;
			case 52:
				return this.mode_halloween;
			case 53:
				return this.mode_bicolor_chase;
			case 54:
				return this.tricolor_chase;
			default:
				return this.mode_static;
		}
	}

	public getPixelColor(nthpixel: number) {
		return this._pixels[nthpixel];
	}

	public setPixelColorByRGBW(nthpixel: number, red: number, green: number, blue: number, w?: number) {
		if (w) 
			this._pixels[nthpixel] = (w << 24) | (red << 16) | (green << 8) | blue;
		else
			this._pixels[nthpixel] = (red << 16) | (green << 8) | blue;
	}

	//TODO: What is c?
	//TODO: Need Rework
	//* Update: Maybe done -> looks better
	setPixelColorByC(nthpixel: number, c: number) {
		let clr = new Uint8Array(3);

		clr[0] = (c >> 16) & 0xff;
		clr[1] = (c >> 8) & 0xff;
		clr[2] = c & 0xff;

		this.setPixelColorByRGBW(nthpixel, clr[0], clr[1], clr[2]);
	}

	fill(color: number, length: number) {
		for (let i = 0; i < length; i++) {
			this._pixels[i] = color;
		}

		//console.log(this._pixels);
		//console.log(this._seg.colors)
	}

	copyPixels(dest: number, src: number, count: number) {
		//console.log("Input", dest, src, count);
		//console.log("PixelsA",this._pixels);

		//copy to index (1*3) the element at index (0*3)
		//copy to index (3)   the element at index (0)
		/*
		const array1 = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,18,19,20];

		// copy to index 0 the element at index 3
		console.log(array1.copyWithin((1 * 3), (0 * 3), 19 * 3));
		console.log(array1.copyWithin((1 * 3), (0 * 3), 19 * 3));
		console.log(array1.copyWithin((1 * 3), (0 * 3), 19 * 3));
		console.log(array1.copyWithin((1 * 3), (0 * 3), 19 * 3));
		console.log(array1.copyWithin((1 * 3), (0 * 3), 19 * 3));
		console.log(array1.copyWithin((1 * 3), (0 * 3), 19 * 3));
		console.log(array1.copyWithin((1 * 3), (0 * 3), 19 * 3));
		console.log(array1.copyWithin((1 * 3), (0 * 3), 19 * 3));
		console.log(array1.copyWithin((1 * 3), (0 * 3), 19 * 3));
		console.log(array1.copyWithin((1 * 3), (0 * 3), 19 * 3));
		console.log(array1.copyWithin((1 * 3), (0 * 3), 19 * 3)); */

		this._pixels.copyWithin(dest, src, count);

		//console.log("PixelsB",this._pixels);
	}

	fillWithSize(color: number, first: number, count: number) {
		let end: number;
		let i: number;

		if (first >= this._seg.length) {
			return; // If first LED is past end of strip, nothing to do
		}

		// Calculate the index ONE AFTER the last pixel to fill
		if (count == 0) {
			// Fill to end of strip
			end = this._seg.length;
		} else {
			// Ensure that the loop won't go past the last pixel
			end = first + count;
			if (end > this._seg.length) end = this._seg.length;
		}

		for (let i = first; i < end; i++) {
			this.setPixelColorByC(i, color);
		}
	}

	blink(color1: number, color2: number, strobe: boolean) {
		if (this._seg.counter_mode_call & 1) {
			let color = IS_REVERSE ? color1 : color2; // off
			this.fill(color, this._seg.length);
			return strobe ? this._seg.speed - 20 : this._seg.speed / 2;
		} else {
			let color = IS_REVERSE ? color2 : color1; // on
			this.fill(color, this._seg.length);
			return strobe ? 20 : this._seg.speed / 2;
		}
	}

	color_wheel(pos: any) {
		pos = 255 - pos;
		if (pos < 85) {
			return ((255 - pos * 3) << 16) | (0 << 8) | (pos * 3);
		} else if (pos < 170) {
			pos -= 85;
			return (0 << 16) | ((pos * 3) << 8) | (255 - pos * 3);
		} else {
			pos -= 170;
			return ((pos * 3) << 16) | ((255 - pos * 3) << 8) | 0;
		}
	}

	color_wipe(color1: number, color2: number, reverse: boolean) {
		if (this._seg.counter_mode_step < this._seg.length) {
			let led_offset = this._seg.counter_mode_step;
			if (IS_REVERSE) {
				this.setPixelColorByC(this._seg.length - led_offset, color1);
			} else {
				this.setPixelColorByC(led_offset, color1);
			}
		} else {
			let led_offset = this._seg.counter_mode_step - this._seg.length;
			if ((IS_REVERSE && !reverse) || (!IS_REVERSE && reverse)) {
				this.setPixelColorByC(this._seg.length - led_offset, color2);
			} else {
				this.setPixelColorByC(led_offset, color2);
			}
		}

		this._seg.counter_mode_step =
			(this._seg.counter_mode_step + 1) % (this._seg.length * 2);

		return this._seg.speed / (this._seg.length * 2);
	}

	get_random_wheel_index(pos: number) {
		let r: number = 0;
		let x: number = 0;
		let y: number = 0;
		let d: number = 0;

		while (d < 42) {
			r = this.random8();
			x = Math.abs(pos - r);
			y = 255 - x;
			d = Math.min(x, y);
		}

		return r;
	}

	color_blend(color1: number, color2: number, blend: number) {
		if (blend == 0) return color1;
		if (blend == 255) return color2;

		let w1: number = (color1 >> 24) & 0xff;
		let r1: number = (color1 >> 16) & 0xff;
		let g1: number = (color1 >> 8) & 0xff;
		let b1: number = color1 & 0xff;

		let w2: number = (color2 >> 24) & 0xff;
		let r2: number = (color2 >> 16) & 0xff;
		let g2: number = (color2 >> 8) & 0xff;
		let b2: number = color2 & 0xff;

		let w3: number = (w2 * blend + w1 * (255 - blend)) / 256;
		let r3: number = (r2 * blend + r1 * (255 - blend)) / 256;
		let g3: number = (g2 * blend + g1 * (255 - blend)) / 256;
		let b3: number = (b2 * blend + b1 * (255 - blend)) / 256;

		return (w3 << 24) | (r3 << 16) | (g3 << 8) | b3;
	}

	twinkle_fade(color: number) {
		this.fade_out();

		if (this.random8(3) == 0) {
			let size = 1;
			let index = this.random16(this._seg.length - size);
			this.fillWithSize(color, index, size);
		}
	}

	scan(color1: number, color2: number, dual: boolean) {
		let dir: number = this._seg.aux_param ? -1 : 1;
		let size: number = 1;

		this.fill(color2, this._seg.length);

		for (let i: number = 0; i <= size; i++) {
			if (IS_REVERSE || dual) {
				this.setPixelColorByC(
					this._seg.length - this._seg.counter_mode_step - i,
					color1
				);
			}
			if (!IS_REVERSE || dual) {
				this.setPixelColorByC(this._seg.counter_mode_step + i, color1);
			}
		}

		this._seg.counter_mode_step += dir;
		if (this._seg.counter_mode_step == 0) {
			this._seg.aux_param = 0;
		}
		if (this._seg.counter_mode_step >= this._seg.length - size) this._seg.aux_param = 1;

		return this._seg.speed / (this._seg.length * 2);
	}

	tricolor_chase(color1: number, color2: number, color3: number) {
		let sizeCnt: number = 1;
		let sizeCnt2: number = sizeCnt + sizeCnt;
		let sizeCnt3: number = sizeCnt2 + sizeCnt;
		let index: number = this._seg.counter_mode_step % sizeCnt3;
		for (let i: number = 0; i < this._seg.length; i++, index++) {
			index = index % sizeCnt3;

			let color: number = color3;
			if (index < sizeCnt) color = color1;
			else if (index < sizeCnt2) color = color2;

			if (IS_REVERSE) {
				this.setPixelColorByC(i, color);
			} else {
				this.setPixelColorByC(this._seg.length - i, color);
			}
		}

		this._seg.counter_mode_step++;

		return this._seg.speed / this._seg.length;
	}

	twinkle(color1: number, color2: number) {
		if (this._seg.counter_mode_step == 0) {
			this.fill(color2, this._seg.length);
			let min_leds: number = this._seg.length / 4 + 1; // make sure, at least one LED is on
			this._seg.counter_mode_step = Math.floor(
				Math.random() * (min_leds * 2 - min_leds) + min_leds
			);
		}

		this.setPixelColorByC(this.random16(this._seg.length), color1);

		this._seg.counter_mode_step--;
		return this._seg.speed / this._seg.length;
	}

	fade_out(targetColor?: number) {
		if (!targetColor) targetColor = this._seg.colors[0];

		const rateMapH: Array<number> = [0, 1, 1, 1, 2, 3, 4, 6];
		const rateMapL: Array<number> = [0, 2, 3, 8, 8, 8, 8, 8];

		//Insert Faderate
		let rate = 0;
		let rateH = rateMapH[rate];
		let rateL = rateMapL[rate];

		let color: number = targetColor;
		let w2: number = (color >> 24) & 0xff;
		let r2: number = (color >> 16) & 0xff;
		let g2: number = (color >> 8) & 0xff;
		let b2: number = color & 0xff;

		for (let i: number = 0; i <= this._seg.length; i++) {
			color = this.getPixelColor(i); // current color
			if (rate == 0) {
				// old fade-to-black algorithm
				this.setPixelColorByC(i, (color >> 1) & 0x7f7f7f7f);
			} else {
				// new fade-to-color algorithm
				let w1 = (color >> 24) & 0xff;
				let r1 = (color >> 16) & 0xff;
				let g1 = (color >> 8) & 0xff;
				let b1 = color & 0xff;

				// calculate the color differences between the current and target colors
				let wdelta = w2 - w1;
				let rdelta = r2 - r1;
				let gdelta = g2 - g1;
				let bdelta = b2 - b1;

				// if the current and target colors are almost the same, jump right to the target
				// color, otherwise calculate an intermediate color. (fixes rounding issues)
				wdelta =
					Math.abs(wdelta) < 3 ? wdelta : (wdelta >> rateH) + (wdelta >> rateL);

				rdelta =
					Math.abs(rdelta) < 3 ? rdelta : (rdelta >> rateH) + (rdelta >> rateL);
				gdelta =
					Math.abs(gdelta) < 3 ? gdelta : (gdelta >> rateH) + (gdelta >> rateL);
				bdelta =
					Math.abs(bdelta) < 3 ? bdelta : (bdelta >> rateH) + (bdelta >> rateL);

				this.setPixelColorByRGBW(
					i,
					r1 + rdelta,
					g1 + gdelta,
					b1 + bdelta,
					w1 + wdelta
				);
			}
		}
	}

	sparkle(color1: number, color2: number) {
		if (this._seg.counter_mode_step == 0) {
			this.fill(color1, this._seg.length);
		}

		let size = 1;
		this.fillWithSize(color1, this._seg.aux_param3, size);

		this._seg.aux_param3 = this.random16(this._seg.length - size); // aux_param3 stores the random led index
		this.fillWithSize(color2, this._seg.aux_param3, size);

		return this._seg.speed / 32;
	}

	//TODO: First LED is off
	chase(color1: number, color2: number, color3: number) {
		let size = 1;
		for (let i: number = 0; i < size; i++) {
			let a = (this._seg.counter_mode_step + i) % this._seg.length;
			let b = (a + size) % this._seg.length;
			let c = (b + size) % this._seg.length;
			if (IS_REVERSE) {
				this.setPixelColorByC(this._seg.length - a, color1);
				this.setPixelColorByC(this._seg.length - b, color2);
				this.setPixelColorByC(this._seg.length - c, color3);
			} else {
				this.setPixelColorByC(a, color1);
				this.setPixelColorByC(b, color2);
				this.setPixelColorByC(c, color3);
			}
		}

		this._seg.counter_mode_step = (this._seg.counter_mode_step + 1) % this._seg.length;

		return this._seg.speed / this._seg.length;
	}

	//TODO: First LED not blinking
	chase_flash(color1: number, color2: number) {
		const flash_count = 4;
		let flash_step = this._seg.counter_mode_call % (flash_count * 2 + 1);

		if (flash_step < flash_count * 2) {
			let color = flash_step % 2 == 0 ? color2 : color1;
			let n = this._seg.counter_mode_step;
			let m = (this._seg.counter_mode_step + 1) % this._seg.length;

			if (IS_REVERSE) {
				this.setPixelColorByC(this._seg.length - n, color);
				this.setPixelColorByC(this._seg.length - m, color);
			} else {
				this.setPixelColorByC(n, color);
				this.setPixelColorByC(m, color);
			}
		} else {
			this._seg.counter_mode_step =
				this._seg.counter_mode_step + (1 % this._seg.length);

			if (this._seg.counter_mode_step == 0) {
				// update aux_param so mode_chase_flash_random() will select the next color
				this._seg.aux_param = this.get_random_wheel_index(this._seg.aux_param);
			}
		}

		return this._seg.speed / this._seg.length;
	}

	//TODO: Reverse doesnt work
	running(color1: number, color2: number) {
		let size = 2;
		let color = this._seg.counter_mode_step & size ? color1 : color2;

		if (IS_REVERSE) {
			this.copyPixels(0, 1, this._seg.length - 1);
			this.setPixelColorByC(this._seg.length - 1, color);
		} else {
			this.copyPixels(1, 0, this._seg.length - 1);
			this.setPixelColorByC(0, color);
		}

		//console.log(this._pixels);

		this._seg.counter_mode_step = this._seg.counter_mode_step + (1 % this._seg.length);

		return this._seg.speed / this._seg.length;
	}

	fireworks(color: number) {
		this.fade_out();

		// for better performance, manipulate the Adafruit_NeoPixels pixels[] array directly
		let bytesPerPixel = 3; // 3=RGB, 4=RGBW
		let startPixel = 0 * bytesPerPixel + bytesPerPixel;
		let stopPixel = this._seg.length * bytesPerPixel;
		for (let i = startPixel; i < stopPixel; i++) {
			let tmpPixel: number = new Uint16Array(
				(this._pixels[i - bytesPerPixel] >> 2) +
					this._pixels[i] +
					(this._pixels[i + bytesPerPixel] >> 2)
			)[0];
			this._pixels[i] = tmpPixel > 255 ? 255 : tmpPixel;
		}

		let size = 2;
		if (!this._seg.triggered) {
			for (let i = 0; i < Math.max(1, this._seg.length / 20); i++) {
				if (this.random8(10) == 0) {
					let index: number = this.random16(this._seg.length - size);
					this.fillWithSize(color, index, size);
				}
			}
		} else {
			for (let i = 0; i < Math.max(1, this._seg.length / 10); i++) {
				let index = this.random16(this._seg.length - size);
				this.fillWithSize(color, index, size);
			}
		}

		return this._seg.speed / this._seg.length;
	}

	fire_flicker(rev_intensity: number) {
		let r = (this._seg.colors[0] >> 16) & 0xff;
		let g = (this._seg.colors[0] >> 8) & 0xff;
		let b = this._seg.colors[0] & 0xff;
		let lum = Math.max(r, Math.max(g, b)) / rev_intensity;

		for (let i = 0; i <= this._seg.length; i++) {
			let flicker = this.random8(lum);
			this.setPixelColorByRGBW(
				i,
				Math.max(r - flicker, 0),
				Math.max(g - flicker, 0),
				Math.max(b - flicker, 0)
			);
		}

		return this._seg.speed / this._seg.length;
	}

	random8(lim?: Uint8Array[0]) {
		this._rand16seed[0] = this._rand16seed[0] * 2053 + 13849;
		let x = (this._rand16seed[0] + (this._rand16seed[0] >> 8)) & 0xff;

		if (lim) x = new Uint16Array([(x * lim) >> 8])[0];

		return x;
	}

	random16(lim?: Int16Array[0]) {
		let x: number = (new Int16Array(0)[0] = this.random8() * 256 + this.random8());

		if (lim) x = new Int16Array(0)[0] = (x * lim) >> 16;
		return x;
	}

	setMode(mode: number) {
		this.mode = this.effectSelector(mode);
	}

	/**
	 *
	 *
	 *
	 *
	 * 				MODES
	 *
	 *
	 *
	 */

	public mode_static() {
		this.fill(this._seg.colors[0], this._seg.length);
		return this._seg.speed;
	}

	public mode_blink() {
		return this.blink(this._seg.colors[0], this._seg.colors[1], false);
	}

	public mode_blink_rainbow() {
		return this.blink(
			this.color_wheel(this._seg.counter_mode_call & 0xff),
			this._seg.colors[1],
			false
		);
	}

	public mode_strobe() {
		return this.blink(this._seg.colors[0], this._seg.colors[1], true);
	}

	public mode_strobe_rainbow() {
		return this.blink(
			this.color_wheel(this._seg.counter_mode_call & 0xff),
			this._seg.colors[1],
			true
		);
	}

	/*
	 * Lights all LEDs one after another.
	 */
	public mode_color_wipe() {
		return this.color_wipe(this._seg.colors[0], this._seg.colors[1], false);
	}

	public mode_color_wipe_inv() {
		return this.color_wipe(this._seg.colors[1], this._seg.colors[0], false);
	}

	public mode_color_wipe_rev() {
		return this.color_wipe(this._seg.colors[0], this._seg.colors[1], true);
	}

	public mode_color_wipe_rev_inv() {
		return this.color_wipe(this._seg.colors[1], this._seg.colors[0], true);
	}

	public mode_color_wipe_random() {
		if (this._seg.counter_mode_step % this._seg.length == 0) {
			// aux_param will store our random color wheel index
			this._seg.aux_param = this.get_random_wheel_index(this._seg.aux_param);
		}
		let color: number = this.color_wheel(this._seg.aux_param);

		return this.color_wipe(color, color, false) * 2;
	}

	public mode_color_sweep_random() {
		if (this._seg.counter_mode_step % this._seg.length == 0) {
			// aux_param will store our random color wheel index
			this._seg.aux_param = this.get_random_wheel_index(this._seg.aux_param);
		}
		let color: number = this.color_wheel(this._seg.aux_param);

		return this.color_wipe(color, color, true) * 2;
	}

	public mode_random_color() {
		this._seg.aux_param = this.get_random_wheel_index(this._seg.aux_param); // aux_param will store our random color wheel index
		let color: number = this.color_wheel(this._seg.aux_param);
		this.fill(color, this._seg.length);

		return this._seg.speed;
	}

	public mode_single_dynamic() {
		if (this._seg.counter_mode_call == 0) {
			for (let i: number = 0; i <= this._seg.length; i++) {
				this.setPixelColorByC(i, this.color_wheel(this.random8()));
			}
		}

		this.setPixelColorByC(
			this.random16(this._seg.length),
			this.color_wheel(this.random8())
		);

		return this._seg.speed;
	}

	public mode_multi_dynamic() {
		for (let i: number = 0; i <= this._seg.length; i++) {
			this.setPixelColorByC(i, this.color_wheel(this.random8()));
		}

		return this._seg.speed;
	}

	public mode_breath() {
		let lum: number = this._seg.counter_mode_step;
		if (lum > 255) lum = 511 - lum; // lum = 15 -> 255 -> 15

		let delay;
		if (lum == 15) delay = 970;
		// 970 pause before each breath
		else if (lum <= 25) delay = 38;
		// 19
		else if (lum <= 50) delay = 36;
		// 18
		else if (lum <= 75) delay = 28;
		// 14
		else if (lum <= 100) delay = 20;
		// 10
		else if (lum <= 125) delay = 14;
		// 7
		else if (lum <= 150) delay = 11;
		// 5
		else delay = 10; // 4

		let color: number = this.color_blend(this._seg.colors[1], this._seg.colors[0], lum);
		this.fill(color, this._seg.length);

		this._seg.counter_mode_step += 2;
		if (this._seg.counter_mode_step > 512 - 15) {
			this._seg.counter_mode_step = 15;
		}

		return delay;
	}

	public mode_fade() {
		let lum: number = this._seg.counter_mode_step;
		if (lum > 255) lum = 511 - lum; // lum = 15 -> 255 -> 15

		let color: number = this.color_blend(this._seg.colors[1], this._seg.colors[0], lum);
		this.fill(color, this._seg.length);

		this._seg.counter_mode_step += 4;
		if (this._seg.counter_mode_step > 512 - 15) {
			this._seg.counter_mode_step = 0;
		}

		return this._seg.speed / 128;
	}

	public mode_scan() {
		return this.scan(this._seg.colors[0], this._seg.colors[1], false);
	}

	public mode_dual_scan() {
		return this.scan(this._seg.colors[0], this._seg.colors[1], true);
	}

	public mode_rainbow() {
		let color: number = this.color_wheel(this._seg.counter_mode_step);
		this.fill(color, this._seg.length);

		this._seg.counter_mode_step = (this._seg.counter_mode_step + 1) & 0xff;

		return this._seg.speed / 256;
	}

	public mode_rainbow_cycle() {
		for (let i: number = 0; i < this._seg.length; i++) {
			let color: number = this.color_wheel(
				((i * 256) / -this._seg.length + this._seg.counter_mode_step) & 0xff
			);
			this.setPixelColorByC(i, color);
		}

		this._seg.counter_mode_step = (this._seg.counter_mode_step + 1) & 0xff;

		return this._seg.speed / 256;
	}

	public mode_tricolor_chase() {
		return this.tricolor_chase(
			this._seg.colors[0],
			this._seg.colors[1],
			this._seg.colors[2]
		);
	}

	public mode_circus_combustus() {
		return this.tricolor_chase(RED, WHITE, BLACK);
	}

	public mode_theater_chase() {
		return this.tricolor_chase(
			this._seg.colors[0],
			this._seg.colors[1],
			this._seg.colors[1]
		);
	}

	public mode_theater_chase_rainbow() {
		this._seg.counter_mode_step = (this._seg.counter_mode_step + 1) & 0xff;
		let color: number = this.color_wheel(this._seg.counter_mode_step);

		return this.tricolor_chase(color, this._seg.colors[1], this._seg.colors[1]);
	}

	public mode_running_lights() {
		let size: number = 1;
		let sineIncr: number = Math.max(1, (256 / this._seg.length) * size);
		for (let i: number = 0; i < this._seg.length; i++) {
			let lum: number = this.sine8((i + this._seg.counter_mode_step) * sineIncr);
			let color: number = this.color_blend(
				this._seg.colors[0],
				this._seg.colors[1],
				lum
			);

			if (IS_REVERSE) {
				this.setPixelColorByC(i, color);
			} else {
				this.setPixelColorByC(this._seg.length - i, color);
			}
		}
		this._seg.counter_mode_step = (this._seg.counter_mode_step + 1) % 256;

		return this._seg.speed / this._seg.length;
	}

	public mode_twinkle() {
		return this.twinkle(this._seg.colors[0], this._seg.colors[1]);
	}

	public mode_twinkle_random() {
		return this.twinkle(this.color_wheel(this.random8()), this._seg.colors[1]);
	}

	//TODO: Is this right?
	public mode_twinkle_fade() {
		return this.twinkle_fade(this._seg.colors[0]);
	}

	//TODO: Is this right?
	public mode_twinkle_fade_random() {
		return this.twinkle_fade(this.color_wheel(this.random8()));
	}

	//TODO: Is this right?
	public mode_sparkle() {
		return this.sparkle(this._seg.colors[1], this._seg.colors[0]);
	}

	//TODO: Is this right?
	public mode_flash_sparkle() {
		return this.sparkle(this._seg.colors[0], WHITE);
	}

	//TODO: Is this right?
	public mode_hyper_sparkle() {
		this.fill(this._seg.colors[0], this._seg.length);

		let size = 1;
		for (let i = 0; i < 8; i++) {
			this.fillWithSize(WHITE, this.random16(this._seg.length - size), size);
		}
		return this._seg.speed / 32;
	}

	//TODO: Is this right?
	public mode_multi_strobe() {
		this.fill(this._seg.colors[0], this._seg.length);

		let delay = 200 + (9 - (this._seg.speed % 10)) * 100;
		let count: number = 2 * (this._seg.speed / 100 + 1);
		if (this._seg.counter_mode_step < count) {
			if ((this._seg.counter_mode_step & 1) == 0) {
				this.fill(this._seg.colors[0], this._seg.length);
				delay = 20;
			} else {
				delay = 50;
			}
		}

		this._seg.counter_mode_step = (this._seg.counter_mode_step + 1) % (count + 1);

		return delay;
	}

	public mode_bicolor_chase() {
		return this.chase(this._seg.colors[0], this._seg.colors[1], this._seg.colors[2]);
	}

	public mode_chase_color() {
		return this.chase(this._seg.colors[0], WHITE, WHITE);
	}

	public mode_chase_blackout() {
		return this.chase(this._seg.colors[0], BLACK, BLACK);
	}

	public mode_chase_white() {
		return this.chase(WHITE, this._seg.colors[0], this._seg.colors[0]);
	}

	public mode_chase_random() {
		if (this._seg.counter_mode_step == 0) {
			this._seg.aux_param = this.get_random_wheel_index(this._seg.aux_param);
		}
		return this.chase(this.color_wheel(this._seg.aux_param), WHITE, WHITE);
	}

	public mode_chase_rainbow_white() {
		let n = this._seg.counter_mode_step;
		let m = (this._seg.counter_mode_step + 1) % this._seg.length;
		let color2 = this.color_wheel(
			((n * 256) / this._seg.length + (this._seg.counter_mode_call & 0xff)) & 0xff
		);
		let color3 = this.color_wheel(
			((m * 256) / this._seg.length + (this._seg.counter_mode_call & 0xff)) & 0xff
		);

		return this.chase(WHITE, color2, color3);
	}

	public mode_chase_rainbow() {
		let color_sep = 256 / this._seg.length;
		let color_index = this._seg.counter_mode_call & 0xff;
		let color = this.color_wheel(
			(this._seg.counter_mode_step * color_sep + color_index) & 0xff
		);

		return this.chase(color, WHITE, WHITE);
	}

	public mode_chase_blackout_rainbow() {
		let color_sep = 256 / this._seg.length;
		let color_index = this._seg.counter_mode_call & 0xff;
		let color = this.color_wheel(
			(this._seg.counter_mode_step * color_sep + color_index) & 0xff
		);

		return this.chase(color, BLACK, BLACK);
	}

	public mode_chase_flash() {
		return this.chase_flash(this._seg.colors[0], WHITE);
	}

	public mode_chase_flash_random() {
		return this.chase_flash(this.color_wheel(this._seg.aux_param), WHITE);
	}

	public mode_running_color() {
		return this.running(this._seg.colors[0], this._seg.colors[1]);
	}

	public mode_running_red_blue() {
		return this.running(RED, BLUE);
	}

	public mode_merry_christmas() {
		return this.running(RED, GREEN);
	}

	public mode_halloween() {
		return this.running(PURPLE, ORANGE);
	}

	public mode_running_random() {
		let size = 2;
		if (this._seg.counter_mode_step % size == 0) {
			this._seg.aux_param = this.get_random_wheel_index(this._seg.aux_param);
		}

		let color = this.color_wheel(this._seg.aux_param);

		return this.running(color, color);
	}

	public mode_larson_scanner() {
		this.fade_out();

		if (this._seg.counter_mode_step < this._seg.length) {
			if (IS_REVERSE) {
				this.setPixelColorByC(
					this._seg.length - this._seg.counter_mode_step,
					this._seg.colors[0]
				);
			} else {
				this.setPixelColorByC(this._seg.counter_mode_step, this._seg.colors[0]);
			}
		} else {
			let index = this._seg.length * 2 - this._seg.counter_mode_step - 2;
			if (IS_REVERSE) {
				this.setPixelColorByC(this._seg.length - index, this._seg.colors[0]);
			} else {
				this.setPixelColorByC(index, this._seg.colors[0]);
			}
		}

		this._seg.counter_mode_step++;
		if (this._seg.counter_mode_step >= this._seg.length * 2 - 2) {
			this._seg.counter_mode_step = 0;
		}

		return this._seg.speed / (this._seg.length * 2);
	}

	public mode_comet() {
		this.fade_out();

		if (IS_REVERSE) {
			this.setPixelColorByC(
				this._seg.length - this._seg.counter_mode_step,
				this._seg.colors[0]
			);
		} else {
			this.setPixelColorByC(this._seg.counter_mode_step, this._seg.colors[0]);
		}

		this._seg.counter_mode_step = (this._seg.counter_mode_step + 1) % this._seg.length;

		return this._seg.speed / this._seg.length;
	}

	public mode_fireworks() {
		let color: number = BLACK;
		do {
			// randomly choose a non-BLACK color from the colors array
			color = this._seg.colors[this.random8(3)];
		} while (color == BLACK);
		return this.fireworks(color);
	}

	public mode_fireworks_random() {
		return this.fireworks(this.color_wheel(this.random8()));
	}

	public mode_fire_flicker() {
		return this.fire_flicker(3);
	}

	public mode_fire_flicker_soft() {
		return this.fire_flicker(6);
	}

	public mode_fire_flicker_intense() {
		return this.fire_flicker(1);
	}

	public mode_icu() {
		let dest = this._seg.counter_mode_step & 0xffff;

		this.setPixelColorByC(dest, this._seg.colors[0]);
		this.setPixelColorByC(dest + this._seg.length / 2, this._seg.colors[0]);

		if (this._seg.aux_param3 == dest) {
			// pause between eye movements
			if (this.random8(6) == 0) {
				// blink once in a while
				this.setPixelColorByC(dest, BLACK);
				this.setPixelColorByC(dest + this._seg.length / 2, BLACK);
				return 200;
			}
			this._seg.aux_param3 = this.random16(this._seg.length / 2);
			return 1000 + this.random16(2000);
		}

		this.setPixelColorByC(dest, BLACK);
		this.setPixelColorByC(dest + this._seg.length / 2, BLACK);

		if (this._seg.aux_param3 > this._seg.counter_mode_step) {
			this._seg.counter_mode_step++;
			dest++;
		} else if (this._seg.aux_param3 < this._seg.counter_mode_step) {
			this._seg.counter_mode_step--;
			dest--;
		}

		this.setPixelColorByC(dest, this._seg.colors[0]);
		this.setPixelColorByC(dest + this._seg.length / 2, this._seg.colors[0]);

		return this._seg.speed / this._seg.length;
	}
}

let x = new WS2812FX_Modes(
	{
		leds: 20,
		stripType: "grb",
		brightness: 255,
	},
	1200
);



