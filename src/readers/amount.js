const { TypeReader, TypeReaderResult } = require('patron.js');
const numeric_values = {
  thousand: 1e3,
  million: 1e6,
  billion: 1e9
};
const max_dec = 2;

class Amount extends TypeReader {
  constructor() {
    super({ type: 'amount' });
  }

  async read(cmd, msg, arg, args, input) {
    let value = Number(Number.parseFloat(input).toFixed(max_dec));

    if (Number.isNaN(value) === false) {
      if (input.toLowerCase().endsWith('k')) {
        value *= numeric_values.thousand;
      } else if (input.toLowerCase().endsWith('m')) {
        value *= numeric_values.million;
      } else if (input.toLowerCase().endsWith('b')) {
        value *= numeric_values.billion;
      }

      return TypeReaderResult.fromSuccess(value);
    }

    return TypeReaderResult.fromError(
      cmd,
      `you have provided an invalid ${arg.name}`
    );
  }
}

module.exports = new Amount();
