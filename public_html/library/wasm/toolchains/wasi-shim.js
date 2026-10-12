export function createWasiPreview1(memoryRef, output) {
  return {
    clock_time_get(_clockId, _precision, timePointer) {
      new DataView(memoryRef.current.buffer).setBigUint64(timePointer, 0n, true);
      return 0;
    },
    fd_write(fd, vectorsPointer, count, writtenPointer) {
      const view = new DataView(memoryRef.current.buffer);
      let total = 0;
      for (let index = 0; index < count; index += 1) {
        const pointer = vectorsPointer + index * 8;
        const buffer = view.getUint32(pointer, true);
        const length = view.getUint32(pointer + 4, true);
        if (fd === 1 || fd === 2) {
          output.push(
            new TextDecoder().decode(new Uint8Array(memoryRef.current.buffer, buffer, length)),
          );
        }
        total += length;
      }
      view.setUint32(writtenPointer, total, true);
      return 0;
    },
    proc_exit(code) {
      throw new Error(`WASI process exited with status ${code}.`);
    },
    random_get(pointer, length) {
      new Uint8Array(memoryRef.current.buffer, pointer, length).fill(0);
      return 0;
    },
  };
}
