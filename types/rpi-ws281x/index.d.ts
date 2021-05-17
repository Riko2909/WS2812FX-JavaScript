declare module 'rpi-ws281x' {

    /**
     * Configures the ws281x strip. Must be called once and before anything else.
     * @param config LEDConfig
     */
    function configure(config: LEDConfig): void;

    /**
     * Resets configuration.
     */
    function reset(): void;

    /**
     * Sleeps for the specified number of milliseconds.
     * @param ms time in milliseconds
     */
    function sleep(ms: Number): void;

    /**
     * Renders the pixels specified to the strip. The pixels parameter must be an Uint32Array representing the 
     * color values of all pixels and the same size as the number of leds specified when configuring.
     * @param config Uint32Array
     */
    function render(config: Uint32Array): void;

    interface LEDConfig {
        /**
         * Use DMA 10
         * @default 10
         */
        dma?: Number,
        /**
         * Number of leds in my strip
         */
        leds: any,
        /**
         * Set full brightness, a value from 0 to 255
         * @default 255
         */
        brightness?: Number,
        /**
         * Set the GPIO number to communicate with the Neopixel strip
         * @default 18
         */
        gpio?: Number,

        /**
         * The RGB sequence may vary on some strips. Valid values are "rgb", "rbg", "grb", "gbr", "bgr", "brg".
         * RGBW strips are not currently supported.
         * @default rgb
         */
        stripType?: string
    }
}