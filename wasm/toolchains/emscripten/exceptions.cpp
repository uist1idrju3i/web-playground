extern "C" int run(void) {
  try {
    throw 42;
  } catch (int value) {
    return value;
  }
}
