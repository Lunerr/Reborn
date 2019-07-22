const { TypeReader, TypeReaderResult } = require('patron.js');
const numeric_values = {
  THOUSAND: 1e3,
  MILLION: 1e6,
  BILLION: 1e9
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
        value *= numeric_values.THOUSAND;
      } else if (input.toLowerCase().endsWith('m')) {
        value *= numeric_values.MILLION;
      } else if (input.toLowerCase().endsWith('b')) {
        value *= numeric_values.BILLION;
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
