const fs = require('fs')

const math = (lvalue, operator, rvalue) => {
    lvalue = parseFloat(lvalue);
    rvalue = parseFloat(rvalue);
    return {
        "+": lvalue + rvalue,
        "-": lvalue - rvalue,
        "*": lvalue * rvalue,
        "/": lvalue / rvalue,
        "%": lvalue % rvalue
    }[operator];
}

const removeFile = (path) => {
    try {
        fs.unlinkSync(path)
        //file removed
    } catch (err) {
        return;
    }
}

module.exports = { math, removeFile }