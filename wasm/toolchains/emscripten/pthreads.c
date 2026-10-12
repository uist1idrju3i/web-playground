#include <pthread.h>

static int value;

static void *calculate(void *unused) {
  (void)unused;
  value = 42;
  return 0;
}

int run(void) {
  pthread_t thread;
  if (pthread_create(&thread, 0, calculate, 0) != 0) return 0;
  if (pthread_join(thread, 0) != 0) return 0;
  return value;
}
