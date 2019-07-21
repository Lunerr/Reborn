const { ArgumentPrecondition, PreconditionResult } = require('patron.js');
const number = require('../../utilities/number.js');

class Max extends ArgumentPrecondition {
  constructor() {
    super({ name: 'max' });
  }

  async run(command, msg, argument, args, value, options) {
    if (value >= options.maximum) {
      return PreconditionResult.fromError(
        command,
        `The maximum ${argument.name} is ${number.format(options.maximum)}`
      );
    }

    return PreconditionResult.fromSuccess();
  }
}

module.exports = new Max();
