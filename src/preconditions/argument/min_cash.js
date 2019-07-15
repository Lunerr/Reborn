const { ArgumentPrecondition, PreconditionResult } = require('patron.js');
const number = require('../../utilities/number.js');

class MinCash extends ArgumentPrecondition {
  constructor() {
    super({ name: 'min_cash' });
  }

  async run(command, msg, argument, args, value, options) {
    if (value >= options.minimum) {
      return PreconditionResult.fromSuccess();
    }

    return PreconditionResult.fromError(
      command,
      `The minimum ${argument.name} is ${number.format(options.minimum)}.`
    );
  }
}

module.exports = new MinCash();
