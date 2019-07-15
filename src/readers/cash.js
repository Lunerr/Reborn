const { TypeReader, TypeReaderResult } = require('patron.js');
const db = require('../services/database.js');
const reg = require('../services/registry.js');
const half = 2;

class Cash extends TypeReader {
  constructor() {
    super({ type: 'cash' });
    this.inputted_all = false;
  }

  async read(cmd, msg, arg, args, input) {
    const cash = db.get_cash(msg.author.id, msg.channel.guild.id);

    if (input.toLowerCase() === 'all') {
      this.inputted_all = true;

      return TypeReaderResult.fromSuccess(cash);
    } else if (input.toLowerCase() === 'half') {
      return TypeReaderResult.fromSuccess(cash / half);
    }

    this.inputted_all = false;

    const amountReader = reg.typeReaders.find(x => x.type === 'amount');
    const result = await amountReader.read(cmd, msg, arg, args, input);

    if (!result.success) {
      return TypeReaderResult.fromError(
        cmd,
        result.errorReason
      );
    }

    return TypeReaderResult.fromSuccess(result.value);
  }
}

module.exports = new Cash();
