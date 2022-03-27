/*
Original: https://github.com/mossmann/hackrf/blob/master/host/libhackrf/src/hackrf.c
Copyright (c) 2012, Jared Boone <jared@sharebrained.com>
Copyright (c) 2013, Benjamin Vernoux <titanmkd@gmail.com>
Copyright (c) 2013, Michael Ossmann <mike@ossmann.com>

This JavaScript impl:
Copyright (c) 2019, cho45 <cho45@lowreal.net>

All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
    Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
    Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the 
    documentation and/or other materials provided with the distribution.
    Neither the name of Great Scott Gadgets nor the names of its contributors may be used to endorse or promote products derived from this software
    without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, 
THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

class HackRF {
	static BOARD_ID_NAME = {
		0: "JellyBean",
		1: "JawBreaker",
		2: "HackRF One",
		3: "rad1o",
		255: "Invalid Board ID",
	};

	static USB_CONFIG_STANDARD = 0x1;
	static TRANSFER_BUFFER_SIZE = 262144 ;

	static SAMPLES_PER_BLOCK = 8192;
	static BYTES_PER_BLOCK = 16384;
	static MAX_SWEEP_RANGES = 10;

	static SWEEP_STYLE_LINEAR = 0;
	static SWEEP_STYLE_INTERLEAVED = 1;

	static HACKRF_VENDOR_REQUEST_SET_TRANSCEIVER_MODE = 1;
	static HACKRF_VENDOR_REQUEST_MAX2837_WRITE = 2;
	static HACKRF_VENDOR_REQUEST_MAX2837_READ = 3;
	static HACKRF_VENDOR_REQUEST_SI5351C_WRITE = 4;
	static HACKRF_VENDOR_REQUEST_SI5351C_READ = 5;
	static HACKRF_VENDOR_REQUEST_SAMPLE_RATE_SET = 6;
	static HACKRF_VENDOR_REQUEST_BASEBAND_FILTER_BANDWIDTH_SET = 7;
	static HACKRF_VENDOR_REQUEST_RFFC5071_WRITE = 8;
	static HACKRF_VENDOR_REQUEST_RFFC5071_READ = 9;
	static HACKRF_VENDOR_REQUEST_SPIFLASH_ERASE = 10;
	static HACKRF_VENDOR_REQUEST_SPIFLASH_WRITE = 11;
	static HACKRF_VENDOR_REQUEST_SPIFLASH_READ = 12;
	static HACKRF_VENDOR_REQUEST_BOARD_ID_READ = 14;
	static HACKRF_VENDOR_REQUEST_VERSION_STRING_READ = 15;
	static HACKRF_VENDOR_REQUEST_SET_FREQ = 16;
	static HACKRF_VENDOR_REQUEST_AMP_ENABLE = 17;
	static HACKRF_VENDOR_REQUEST_BOARD_PARTID_SERIALNO_READ = 18;
	static HACKRF_VENDOR_REQUEST_SET_LNA_GAIN = 19;
	static HACKRF_VENDOR_REQUEST_SET_VGA_GAIN = 20;
	static HACKRF_VENDOR_REQUEST_SET_TXVGA_GAIN = 21;
	static HACKRF_VENDOR_REQUEST_ANTENNA_ENABLE = 23;
	static HACKRF_VENDOR_REQUEST_SET_FREQ_EXPLICIT = 24;
	static HACKRF_VENDOR_REQUEST_USB_WCID_VENDOR_REQ = 25;
	static HACKRF_VENDOR_REQUEST_INIT_SWEEP = 26;
	static HACKRF_VENDOR_REQUEST_OPERACAKE_GET_BOARDS = 27;
	static HACKRF_VENDOR_REQUEST_OPERACAKE_SET_PORTS = 28;
	static HACKRF_VENDOR_REQUEST_SET_HW_SYNC_MODE = 29;
	static HACKRF_VENDOR_REQUEST_RESET = 30;
	static HACKRF_VENDOR_REQUEST_OPERACAKE_SET_RANGES = 31;
	static HACKRF_VENDOR_REQUEST_CLKOUT_ENABLE = 32;
	static HACKRF_VENDOR_REQUEST_SPIFLASH_STATUS = 33;
	static HACKRF_VENDOR_REQUEST_SPIFLASH_CLEAR_STATUS = 34;
	static HACKRF_VENDOR_REQUEST_OPERACAKE_GPIO_TEST = 35;
	static HACKRF_VENDOR_REQUEST_CPLD_CHECKSUM = 36;
	static HACKRF_TRANSCEIVER_MODE_OFF = 0;
	static HACKRF_TRANSCEIVER_MODE_RECEIVE = 1;
	static HACKRF_TRANSCEIVER_MODE_TRANSMIT = 2;
	static HACKRF_TRANSCEIVER_MODE_SS = 3;
	static TRANSCEIVER_MODE_CPLD_UPDATE = 4;
	static HACKRF_HW_SYNC_MODE_OFF = 0;
	static HACKRF_HW_SYNC_MODE_ON = 1;

	static MAX2837_FT = [
		1750000  ,
		2500000  ,
		3500000  ,
		5000000  ,
		5500000  ,
		6000000  ,
		7000000  ,
		8000000  ,
		9000000  ,
		10000000 ,
		12000000 ,
		14000000 ,
		15000000 ,
		20000000 ,
		24000000 ,
		28000000 
	];

	static computeBasebandFilterBw(bandwidthHz) {
		const i = HackRF.MAX2837_FT.findIndex( (e) => e >= bandwidthHz );
		if (i === -1) {
			throw "invalid bandwidthHz " + bandwidthHz;
		}
		if (i > 0) {
			return HackRF.MAX2837_FT[i-1];
		} else {
			return HackRF.MAX2837_FT[0];
		}
	}

	constructor() {
	}

	static async requestDevice(filters) {
		const device = await navigator.usb.requestDevice({
			filters: filters || [
				// see: https://github.com/mossmann/hackrf/blob/master/host/libhackrf/53-hackrf.rules
				{ vendorId: 0x1d50, productId: 0x604b },
				{ vendorId: 0x1d50, productId: 0x6089 },
				{ vendorId: 0x1d50, productId: 0xcc15 },
				{ vendorId: 0x1fc9, productId: 0x000c },
				{ vendorId: 0x0456, productId: 0xb673 },
			]
		}).catch( e => null );
		if (!device) {
			console.log('no device matched');
			return;
		}
		return device;
	}

	async open(device) {
		if (this.device) {
			await this.close();
			await this.exit();
		}

		console.log(device);
		console.log(device.configurations);

		console.log('open device', device);
		await device.open();
		console.log('selectConfiguration', HackRF.USB_COFIG_STANDARD);
		await device.selectConfiguration(HackRF.USB_CONFIG_STANDARD);
		console.log('claimInterface');
		await device.claimInterface(0);
		console.log('device was opened');

		this.device = device;
	}

	async readBoardId() {
		// https://github.com/mossmann/hackrf/blob/master/host/libhackrf/src/hackrf.c#L1058
		/*
		 * libusb_control_transfer(
		 *   libusb_device_handle *devh,
		 *   uint8_t bmRequestType,
		 *   uint8_t bRequest,
		 *   uint16_t wValue,
		 *   uint16_t wIndex,
		 *   unsigned char *data,
		 *   uint16_t wLength,
		 *   unsigned int timeout
		 * )
		 */
		console.log('readBoardId');
		const result = await this.device.controlTransferIn({
			requestType: "vendor",
			recipient: "device",
			request: HackRF.HACKRF_VENDOR_REQUEST_BOARD_ID_READ,
			value: 0,
			index: 0,
		}, 1);
		console.log(result);
		if (result.status !== 'ok') {
			throw 'failed to readBoardId';
		}
		return result.data.getUint8(0);
	}

	async readVersionString() {
		console.log('readVersionString');
		const result = await this.device.controlTransferIn({
			requestType: "vendor",
			recipient: "device",
			request: HackRF.HACKRF_VENDOR_REQUEST_VERSION_STRING_READ,
			value: 0,
			index: 0,
		}, 255);
		console.log(result);
		if (result.status !== 'ok') {
			throw 'failed to readVersionString';
		}
		return String.fromCharCode(...new Uint8Array(result.data.buffer));
	}

	async readApiVersion() {
		return [this.device.deviceVersionMajor, this.device.deviceVersionMinor, this.device.deviceVersionSubminor];
	}

	async readPartIdSerialNo() {
		console.log('readPartIdSerialNo');
		const result = await this.device.controlTransferIn({
			requestType: "vendor",
			recipient: "device",
			request: HackRF.HACKRF_VENDOR_REQUEST_BOARD_PARTID_SERIALNO_READ,
			value: 0,
			index: 0,
		}, 24);
		console.log(result);
		if (result.status !== 'ok') {
			throw 'failed to readPartIdSerialNo';
		}
		/* 
		 *
		 * https://github.com/mossmann/hackrf/blob/master/host/libhackrf/src/hackrf.h#L119
		 * typedef struct {
		 *   uint32_t part_id[2];
		 *   uint32_t serial_no[4];
		 * } read_partid_serialno_t;
		 *
		 * (32/8) * 2 + (32/8) * 4 = 24
		 */

		const partId = [
			result.data.getUint32(0, true),
			result.data.getUint32(1*4, true)
		];

		const serialNo = [
			result.data.getUint32(2*4, true),
			result.data.getUint32(3*4, true),
			result.data.getUint32(4*4, true),
			result.data.getUint32(5*4, true)
		];

		return { partId, serialNo };
	}

	async setTransceiverMode(mode) {
		console.log('setTransceiverMode', mode);
		const result = await this.device.controlTransferOut({
			requestType: "vendor",
			recipient: "device",
			request: HackRF.HACKRF_VENDOR_REQUEST_SET_TRANSCEIVER_MODE,
			value: mode,
			index: 0,
		});
		console.log(result);
		if (result.status !== 'ok') {
			throw 'failed to setTransceiverMode';
		}
	}

	async setSampleRateManual(freqHz, divider) {
		/*
		 * typedef struct {
		 *   uint32_t freq_hz;
		 *   uint32_t divider;
		 * } set_fracrate_params_t;
		 */
		const params = new DataView(new ArrayBuffer(8));
		params.setUint32(0, freqHz, true);
		params.setUint32(4, divider, true);

		console.log('setSampleRateManual', {freqHz, divider, params});
		const result = await this.device.controlTransferOut({
			requestType: "vendor",
			recipient: "device",
			request: HackRF.HACKRF_VENDOR_REQUEST_SAMPLE_RATE_SET,
			value: 0,
			index: 0,
		}, params.buffer);
		console.log(result);
		if (result.status !== 'ok') {
			throw 'failed to setTransceiverMode';
		}

		this.setBasebandFilterBandwidth(HackRF.computeBasebandFilterBw(0.75 * freqHz / divider));
	}

	async setBasebandFilterBandwidth(bandwidthHz) {
		console.log('setBasebandFilterBandwidth', {bandwidthHz});
		const result = await this.device.controlTransferOut({
			requestType: "vendor",
			recipient: "device",
			request: HackRF.HACKRF_VENDOR_REQUEST_BASEBAND_FILTER_BANDWIDTH_SET,
			value: bandwidthHz & 0xffff,
			index: (bandwidthHz >> 16) & 0xffff,
		});
		console.log(result);
		if (result.status !== 'ok') {
			throw 'failed to setTransceiverMode';
		}
	}

	async setVgaGain(value) {
		if (value > 62) {
			throw "gain must be <= 62";
		}
		value &= ~0x01;
		console.log('setVgaGain', {value});
		const result = await this.device.controlTransferIn({
			requestType: "vendor",
			recipient: "device",
			request: HackRF.HACKRF_VENDOR_REQUEST_SET_VGA_GAIN,
			value: 0,
			index: value,
		}, 1);
		console.log(result);
		if (result.status !== 'ok' || !result.data.getUint8(0)) {
			throw 'failed to setVgaGain';
		}
	}

	async setTxVgaGain(value) {
		if (value > 47) {
			throw "gain must be <= 47";
		}
		console.log('setTxVgaGain', {value});
		const result = await this.device.controlTransferIn({
			requestType: "vendor",
			recipient: "device",
			request: HackRF.HACKRF_VENDOR_REQUEST_SET_TXVGA_GAIN,
			value: 0,
			index: value,
		}, 1);
		console.log(result);
		if (result.status !== 'ok' || !result.data.getUint8(0)) {
			throw 'failed to setVgaGain';
		}
	}

	async setLnaGain(value) {
		if (value > 40) {
			throw "gain must be <= 40";
		}
		value &= ~0x07;
		console.log('setLnaGain', {value});
		const result = await this.device.controlTransferIn({
			requestType: "vendor",
			recipient: "device",
			request: HackRF.HACKRF_VENDOR_REQUEST_SET_LNA_GAIN,
			value: 0,
			index: value,
		}, 1);
		console.log(result);
		if (result.status !== 'ok' || !result.data.getUint8(0)) {
			throw 'failed to setLnaGain';
		}
	}

	async setAmpEnable(value) {
		console.log('setAmpEnable', {value});
		const result = await this.device.controlTransferOut({
			requestType: "vendor",
			recipient: "device",
			request: HackRF.HACKRF_VENDOR_REQUEST_AMP_ENABLE,
			value: value ? 1 : 0,
			index: 0,
		});
		console.log(result);
		if (result.status !== 'ok') {
			throw 'failed to setLnaGain';
		}
	}

	async setAntennaEnable(value) {
		console.log('setAntennaEnable', {value});
		const result = await this.device.controlTransferOut({
			requestType: "vendor",
			recipient: "device",
			request: HackRF.HACKRF_VENDOR_REQUEST_ANTENNA_ENABLE,
			value: value ? 1 : 0,
			index: 0,
		});
		console.log(result);
		if (result.status !== 'ok') {
			throw 'failed to setLnaGain';
		}
	}

	async reset() {
		console.log('reset');
		const result = await this.device.controlTransferOut({
			requestType: "vendor",
			recipient: "device",
			request: HackRF.HACKRF_VENDOR_REQUEST_RESET,
			value: 0,
			index: 0,
		});
		console.log(result);
		if (result.status !== 'ok') {
			throw 'failed to reset';
		}
	}

	async txPacket(callback) {
		await this.setTransceiverMode(HackRF.HACKRF_TRANSCEIVER_MODE_TRANSMIT);
		while (true) {
			const data = callback(HackRF.TRANSFER_BUFFER_SIZE);
			if (!data) {
				break;
			}
			const result = await this.device.transferOut(2, data);
			if (result) {
				if (result.status !== 'ok') {
					throw 'failed to send transfer';
				}
			}
		}
		await this.setTransceiverMode(HackRF.HACKRF_TRANSCEIVER_MODE_OFF);
		this.txRunning = [];
	}

	async startTx(callback) {
		if (this.txRunning) {
			throw "already started";
		}

		await this.setTransceiverMode(HackRF.HACKRF_TRANSCEIVER_MODE_TRANSMIT);
		const transfer = async (resolve) => {
			const data = callback(HackRF.TRANSFER_BUFFER_SIZE);
			if (!data) {
				resolve();
				const promises = this.txRunning;
				console.log(promises);
				this.txRunning = null;
				await Promise.all(promises);
				await this.setTransceiverMode(HackRF.HACKRF_TRANSCEIVER_MODE_OFF);
				await this.exit();
				return;
			}
			const result = await this.device.transferOut(2, data);
			if (this.txRunning) {
				transfer(resolve);
			} else {
				resolve();
			}
			if (result) {
				if (result.status !== 'ok') {
					throw 'failed to send transfer';
				}
			}
		}
		this.txRunning = [
			new Promise( resolve => transfer(resolve) ),
			new Promise( resolve => transfer(resolve) )
		];
    }

	async startRx(callback) {
		if (this.rxRunning) {
			throw "already started";
		}

		await this.setTransceiverMode(HackRF.HACKRF_TRANSCEIVER_MODE_RECEIVE);
		const transfer = async (resolve) => {
			const result = await this.device.transferIn(1, HackRF.TRANSFER_BUFFER_SIZE);
			if (this.rxRunning) {
				transfer(resolve);
			} else {
				resolve();
			}
			// console.log('transferIn', result);
			if (result) {
				if (result.status !== 'ok') {
					throw 'failed to get transfer';
				}
				callback(new Uint8Array(result.data.buffer));
			}
		}
		this.rxRunning = [
			new Promise( resolve => transfer(resolve) ),
			new Promise( resolve => transfer(resolve) )
		];
	}

	async setFreq(freqHz) {
		const data = new DataView(new ArrayBuffer(8));
		const freqMhz = Math.floor(freqHz / 1e6);
		const freqHz0 = freqHz - (freqMhz * 1e6);
		data.setUint32(0, freqMhz, true);
		data.setUint32(4, freqHz0, true);
		console.log('setFreq', {freqHz, freqMhz, freqHz0, data});
		const result = await this.device.controlTransferOut({
			requestType: "vendor",
			recipient: "device",
			request: HackRF.HACKRF_VENDOR_REQUEST_SET_FREQ,
			value: 0,
			index: 0,
		}, data.buffer);
		console.log(result);
		if (result.status !== 'ok') {
			throw 'failed to setFreq';
		}
	}

	async initSweep(frequencyList, numBytes, stepWidth, offset, style) {
		const numRanges = frequencyList.length / 2;
		if (numRanges < 1 || numRanges > HackRF.MAX_SWEEP_RANGES) {
			throw "invalid numRanges";
		}
		if (numBytes % HackRF.BYTES_PER_BLOCK || HackRF.BYTES_PER_BLOCK > numBytes)  {
			throw "invalid numBytes";
		}
		if (stepWidth < 1) {
			throw "invalid stepWidth";
		}

		const data = new DataView(new ArrayBuffer(9 + numRanges * 2 * 2));
		data.setUint8(0, (stepWidth>>0) & 0xff);
		data.setUint8(1, (stepWidth>>8) & 0xff);
		data.setUint8(2, (stepWidth>>16) & 0xff);
		data.setUint8(3, (stepWidth>>24) & 0xff);
		data.setUint8(4, (offset>>0) & 0xff);
		data.setUint8(5, (offset>>8) & 0xff);
		data.setUint8(6, (offset>>16) & 0xff);
		data.setUint8(7, (offset>>24) & 0xff);
		data.setUint8(8, (style) & 0xff);
		for (let i = 0; i < numRanges*2; i++) {
			data.setUint8(9+i*2, frequencyList[i] & 0xff);
			data.setUint8(10+i*2, (frequencyList[i]>>8) & 0xff);
		}
		console.log('initSweep', { frequencyList, numRanges, numBytes, stepWidth, offset, style, data });
		const result = await this.device.controlTransferOut({
			requestType: "vendor",
			recipient: "device",
			request: HackRF.HACKRF_VENDOR_REQUEST_INIT_SWEEP,
			value: numBytes & 0xffff,
			index: (numBytes >> 16) & 0xffff,
		}, data.buffer);
		console.log(result);
		if (result.status !== 'ok') {
			throw 'failed to initSweep';
		}
	}
	
	async stopRx() {
		if (this.rxRunning) {
			console.log('stopRx waiting');
			const promises = this.rxRunning;
			console.log(promises);
			this.rxRunning = null;
			await Promise.all(promises);
		}
		console.log('stopRx');
		await this.setTransceiverMode(HackRF.HACKRF_TRANSCEIVER_MODE_OFF);
	}

	async stopTx() {
		if (this.txRunning) {
			console.log('stopTx waiting');
			const promises = this.txRunning;
			console.log(promises);
			this.txRunning = null;
			await Promise.all(promises);
		}
		await this.setTransceiverMode(HackRF.HACKRF_TRANSCEIVER_MODE_OFF);
	}

	async close() {
		await this.stopRx();
		await this.stopTx();
	}

	async exit() {
		console.log('exit');
		await this.device.close();
	}
}


