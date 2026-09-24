#include "src/lib/timer.h"
#include <atomic>
#include <chrono>
#include <condition_variable>
#include <memory>
#include <mutex>
#include <thread>
#include <vector>

int main() {
	using namespace std::chrono_literals;
	std::mutex mutex;
	std::condition_variable cv;
	bool entered = false;
	bool released = false;
	bool finished = false;
	std::atomic<int> cancelled_fired{0};

	ivm::timer_t first{1, [&](void* next) {
		{
			std::unique_lock<std::mutex> lock{mutex};
			entered = true;
			cv.notify_one();
			cv.wait(lock, [&] { return released; });
		}
		ivm::timer_t::chain(next);
		std::lock_guard<std::mutex> lock{mutex};
		finished = true;
		cv.notify_one();
	}};

	{
		std::unique_lock<std::mutex> lock{mutex};
		if (!cv.wait_for(lock, 5s, [&] { return entered; })) return 1;
	}
	std::vector<std::unique_ptr<ivm::timer_t>> cancelled;
	cancelled.reserve(12000);
	for (int i = 0; i < 12000; ++i) {
		cancelled.emplace_back(std::make_unique<ivm::timer_t>(500, [&](void*) { ++cancelled_fired; }));
	}
	cancelled.clear();
	std::this_thread::sleep_for(1s);
	std::unique_lock<std::mutex> lock{mutex};
	released = true;
	cv.notify_one();
	if (!cv.wait_for(lock, 15s, [&] { return finished; })) return 2;
	lock.unlock();
	if (cancelled_fired.load() != 0) return 2;

	std::mutex second_mutex;
	std::condition_variable second_cv;
	bool second_finished = false;
	ivm::timer_t second{1, [&](void*) {
		std::lock_guard<std::mutex> second_lock{second_mutex};
		second_finished = true;
		second_cv.notify_one();
	}};
	std::unique_lock<std::mutex> second_lock{second_mutex};
	if (!second_cv.wait_for(second_lock, 5s, [&] { return second_finished; })) return 3;
	second_lock.unlock();

	std::atomic<int> chained_fired{0};
	for (int i = 0; i < 12000; ++i) {
		ivm::timer_t::wait_detached(300, [&chained_fired](void* next) {
			++chained_fired;
			ivm::timer_t::chain(next);
		});
	}
	std::this_thread::sleep_for(3s);
	if (chained_fired.load() != 12000) return 4;

	std::mutex third_mutex;
	std::condition_variable third_cv;
	bool third_finished = false;
	ivm::timer_t third{1, [&](void*) {
		std::lock_guard<std::mutex> third_lock{third_mutex};
		third_finished = true;
		third_cv.notify_one();
	}};
	std::unique_lock<std::mutex> third_lock{third_mutex};
	return third_cv.wait_for(third_lock, 5s, [&] { return third_finished; }) ? 0 : 5;
}
