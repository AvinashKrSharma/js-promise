class MyPromise{
	constructor(executor) {
		// initial state of the Promise object should be pending
		this.state = "pending"; 

		// store the value after success or reason after fail
		this.value = undefined;      

		let resolve = (result) => {
			// if the state of promise isn't "pending", then the promise is already fulfilled and we don't need to do anything
			if (this.state !== 'pending') return;

			// update the state and value of the promise
			this.state = 'resolved';
			this.value = result;

			// when resolving the promise, we need to call all the onresolve fns, so here we call all of them
			this.resolveFns.forEach((resolveFn) => {
				// for non function values, meaning which are resolved, we don't do anything
				if (typeof resolveFn !== 'function') return;

				// if the item is fn, then call it with value
				resolveFn(this.value);
			});

		}

		let reject = (error) => {
			// if the state of promise isn't "pending", then the promise is already fulfilled and we don't need to do anything
			if (this.state !== 'pending') return;

			// update the state and value of the promise
			this.state = 'rejected';
			this.value = error;

			// when rejecting the promise, we need to call all the onreject fns, so here we call all of them
			this.rejectFns.forEach((rejectFn) => {
				// for non function values, meaning which are resolved, we don't do anything
				if (typeof rejectFn !== 'function') return;

				// if the item is fn, then call it with value
				rejectFn(this.value);
			});
		}

		// these will store all the onresolve/onreject functions in the chain
		this.resolveFns = [];
		this.rejectFns = [];

		// Even if an exception occurs to the executor function, 
		// it should be handled within the Promise function,
		// not thrown outside the Promise function.
		try {
			// our previously defined resolve and reject are passed from the Promise class to the executor as paramenters
			executor(resolve, reject)
		} catch(err) {
			reject(err)
		}
	}

	then(onResolveFn, onRejectFn) {
		// if the arguments passed aren't function, we have to return the results directly
		if (typeof onResolveFn !== 'function') {
			onResolveFn = (result) => result;
		}
		if (typeof onRejectFn !== 'function') {
			onRejectFn = (error) => error;
		}

		// then returns a promise to make chaining possible
		return new MyPromise((resolve, reject) => {
			// then basically adds the passed fns to resolveFn and rejectFn arrays so that, when promise resolves/rejects, all of them can be called
			// when then is called, we have to push the resolve and reject callbacks into the arrays we defined earlier in the constructor

			// here, the fns that are pushed get the promise's value(val/err) as argument when they are called from the resolve/reject method
			this.resolveFns.push((result) => {
				try {
					// when the promise is resolved and this fn is called from the fns in the resolveFns array, we need
					// to execute the onresolvefn earlier passed to the then method
					// we store the result of the onResolve method call
					let x = onResolveFn(result);

					// check if the result is a promise, if yes, call it's then method so that when this Promise is
					// resolved, we have the onResolve and onReject functions pushed in it's method arrays
					// it's basically recursion for promises
					if (x instanceof MyPromise) {
						x.then(resolve, reject);	
						return;
					}

					// else we are done with the current promise and can safely fulfill the promise to move to the next promise in chain
					resolve(x);

				} catch(err) {
					// like in the original promise constructor, where we call the executor, if the onResolve call fails for some reason, we reject the promise
					reject(err)
				}
			})

			this.rejectFns.push((error) => {
				try {
					let x = onRejectFn(error);

					if(x instanceof MyPromise) {
						x.then(resolve, reject)
						return;
					}

					resolve(x);
				} catch(err) {
					reject(err)
				}
			})
		})
	}

	// catch method is same as calling the then method with with only onReject callback
	catch(onRejectFn) {
		return this.then(null, onRejectFn);
	}

	// finally also returns a promise.
	// using finally, we need to call the supplied finallyFn after the promise has fulfilled i.e. resolved/rejected
	// the promise returned by finally is resolved with the value/error of the original fullfilled promise
	finally(finallyFn) {
		// because finally returns a promise and so does then,
		// we need both onResolve and onReject params for the then method, because finally is called on both states
		return this.then(
			// what the onResolve callback does is that, it resolves the promise returned by finally, calling the finallyFn and ...
			(value) => {
				return this.constructor.resolve(finallyFn())
				// while resolving the finally promise, it's resolved with the value of original resolved promise.
					.then(() => value)
			}, 
			// onReject callback does the same thing as onResolve callback above, i.e. it rejects the promise returned by finally, calling the finallyFn and ...
			(error) => {
				return this.constructor.reject(finallyFn())
				// while rejecting the finally promise, it's rejected with the rejection reason of original rejected promise.
					.then(() => error)
			});
	}

	// this is to enable MyPromise.resolve(...) to return a resolved Promise
	static resolve(result) {
		return new MyPromise(resolve => {
			resolve(result)
		})
	}

	// this is to enable MyPromise.reject(...) to return a rejected Promise
	static reject(reason) {
		return new MyPromise((_, reject) => {
			reject(reason);
		})
	}

	static all(promiseArr) {
		// all also returns a promise which is resolved when all the promises in the promiseArr have resolve
		return new MyPromise((resolve, reject) => {
			var result = [];
			var resolvedPromiseCount = 0;
			promiseArr.forEach((promise, index) => {
				let i = index;
				// incase, the current item is not a Promise
				if (promise instanceof MyPromise) {
					promise.then((result) => {
						resolvedPromiseCount++;
						result[i] = result;

						// if resolvedPromiseCount === promiseArr.length, we resolve the promise
						if (resolvedPromiseCount === promiseArr.length) {
							resolve(result);
						}
					}).catch((e) => {
						reject(e);
					})
				}
			})
		});
	}
}
