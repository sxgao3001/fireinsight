package org.mozilla.javascript;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.PrintWriter;
import java.io.Reader;



public class parseJS {

    private static Decompiler decompiler = new Decompiler();
    
    public static void main(String[] args) throws Exception {
        File files = new File(args[0]);
        for(File file : files.listFiles()) {
            try {
                Reader reader = new FileReader(file); 
                PrintWriter pw = new PrintWriter(new FileOutputStream(file.getAbsolutePath()+".txt"));
                CompilerEnvirons compilerEnv = new CompilerEnvirons();
                ErrorReporter errorReporter = compilerEnv.getErrorReporter();
                Parser parser = new Parser(compilerEnv, errorReporter);         
                ScriptOrFnNode tree = parser.parse(reader, file.getName(), 1); 
                String sb = tree.toStringTree(tree);
                //System.err.println(sb);
                String encodedSource = parser.getEncodedSource();
                String r = decompile(encodedSource);
                pw.print(r);
                pw.close();
            } catch(Exception e) {
                e.printStackTrace();
            }
        }
    }
    
    public final static String transform(String name, Reader reader)  throws Exception {
        try {
            CompilerEnvirons compilerEnv = new CompilerEnvirons();
            ErrorReporter errorReporter = compilerEnv.getErrorReporter();
            Parser parser = new Parser(compilerEnv, errorReporter);         
            ScriptOrFnNode tree = parser.parse(reader, name, 1);
            //System.out.println(tree.toStringTree(tree));
            String encodedSource = parser.getEncodedSource();
            String result = decompile(encodedSource);
            return result;
        } catch(Exception e) {
            e.printStackTrace();
            return null;
        }
    }
    
    public final static void transform(ScriptOrFnNode tree)
    {
        transformCompilationUnit(tree, tree, false);
        for (int i = 0; i != tree.getFunctionCount(); ++i) {
            FunctionNode fn = tree.getFunctionNode(i);
            transform(fn);
        }
    }

    private static void transformCompilationUnit(final ScriptOrFnNode tree,
            final Node node,
            boolean createScopeObjects)
    {

        int offset = 0;
        int nodeType = node.getType();
        switch (nodeType) {

        case Token.NAME:
        {
            decompiler.addName(node.getString());
            break;
        }
        case Token.EOL:
        {
            //decompiler.addEOL();
            break;
        }
        case Token.NUMBER:
        {
            decompiler.addNumber(0);
            break;
        }
        case Token.REGEXP:
        {
            System.err.println("SKIPPING");
            break;
        }
        case Token.STRING:
        {
            decompiler.addString(node.getString());
            break;
        }
        case Token.FUNCTION:
        { 
            offset = decompiler.getCurrentOffset();
            decompiler.markFunctionStart(FunctionNode.FUNCTION_STATEMENT);


        }


        default: 
        {
            decompiler.addToken(nodeType);
        }
        }


        Node n = node.getFirstChild();
        while(n!=null)
        {
            transformCompilationUnit(tree, n, createScopeObjects);
            n = n.getNext();
        }

        if (node.getType()==Token.FUNCTION)
        {

            decompiler.markFunctionEnd(offset);
        }


    }


    public static String decompile(String source)
    {
        /**
         * Flag to indicate that the decompilation should omit the
         * function header and trailing brace.
         */
        final int ONLY_BODY_FLAG = 1 << 0;

        /**
         * Flag to indicate that the decompilation generates toSource result.
         */
        final int TO_SOURCE_FLAG = 1 << 1;

        /**
         * Decompilation property to specify initial ident value.
         */
        final int INITIAL_INDENT_PROP = 1;

        /**
         * Decompilation property to specify default identation offset.
         */
        final int INDENT_GAP_PROP = 2;

        /**
         * Decompilation property to specify identation offset for case labels.
         */
        final int CASE_GAP_PROP = 3;

        // Marker to denote the last RC of function so it can be distinguished from
        // the last RC of object literals in case of function expressions
        final int FUNCTION_END = Token.LAST_TOKEN + 1;




        int length = source.length();
        if (length == 0) { return ""; }

        int indent = 4;
        if (indent < 0) throw new IllegalArgumentException();
        int indentGap = 2;
        if (indentGap < 0) throw new IllegalArgumentException();
        int caseGap = 2;
        if (caseGap < 0) throw new IllegalArgumentException();

        StringBuffer result = new StringBuffer();
        boolean justFunctionBody = false;
        boolean toSource = true;

//      Spew tokens in source, for debugging.
//      as TYPE number char
        if (false) {
            System.err.println("length:" + length);
            for (int i = 0; i < length; ++i) {
//              Note that tokenToName will fail unless Context.printTrees
//              is true.
                String tokenname = null;
                if (true) {
                    tokenname = Token.name(source.charAt(i));
                }
                if (tokenname == null) {
                    tokenname = "---";
                }
                String pad = tokenname.length() > 7
                ? "\t"
                        : "\t\t";
                System.err.println
                (tokenname
                        + pad + (int)source.charAt(i)
                        + "\t'" + ScriptRuntime.escapeString
                        (source.substring(i, i+1))
                        + "'");
            }
            System.err.println();
        }

        int braceNesting = 0;
        boolean afterFirstEOL = false;
        int i = 0;
        int topFunctionType;
        if (source.charAt(i) == Token.SCRIPT) {
            ++i;
            topFunctionType = -1;
        } else {
            topFunctionType = source.charAt(i + 1);
        }

        if (!toSource) {
//          add an initial newline to exactly match js.
            result.append('\n');
            for (int j = 0; j < indent; j++)
                result.append(' ');
        } else {
            if (topFunctionType == FunctionNode.FUNCTION_EXPRESSION) {
                result.append('(');
            }
        }

        while (i < length) {
            switch(source.charAt(i)) {
            case Token.GET:
            case Token.SET:
                result.append(source.charAt(i) == Token.GET ? "get " : "set ");
                ++i;
                i = printSourceString(source, i + 1, false, result);
//              Now increment one more to get past the FUNCTION token
                ++i;
                break;

            case Token.NAME:
            case Token.REGEXP:  // re-wrapped in '/'s in parser...
                i = printSourceString(source, i + 1, false, result);
                continue;

            case Token.STRING:
                i = printSourceString(source, i + 1, true, result);
                continue;

            case Token.NUMBER:
                i = printSourceNumber(source, i + 1, result);
                continue;

            case Token.TRUE:
                result.append("true");
                break;

            case Token.FALSE:
                result.append("false");
                break;

            case Token.NULL:
                result.append("null");
                break;

            case Token.THIS:
                result.append("this");
                break;

            case Token.FUNCTION:
                ++i; // skip function type
                result.append("function ");
                break;

            case FUNCTION_END:
//              Do nothing
                break;

            case Token.COMMA:
                result.append(", ");
                break;

            case Token.LC:
                ++braceNesting;
                if (Token.EOL == getNext(source, length, i))
                    indent += indentGap;
                result.append('{');
                break;

            case Token.RC: {
                --braceNesting;
                /* don't print the closing RC if it closes the
                 * toplevel function and we're called from
                 * decompileFunctionBody.
                 */
                if (justFunctionBody && braceNesting == 0)
                    break;

                result.append('}');
                switch (getNext(source, length, i)) {
                case Token.EOL:
                case FUNCTION_END:
                    indent -= indentGap;
                    break;
                case Token.WHILE:
                case Token.ELSE:
                    indent -= indentGap;
                    result.append(' ');
                    break;
                }
                break;
            }
            case Token.LP:
                result.append('(');
                break;

            case Token.RP:
                result.append(')');
                if (Token.LC == getNext(source, length, i))
                    result.append(' ');
                break;

            case Token.LB:
                result.append('[');
                break;

            case Token.RB:
                result.append(']');
                break;

            case Token.EOL: {
                if (toSource) break;
                boolean newLine = true;
                if (!afterFirstEOL) {
                    afterFirstEOL = true;
                    if (justFunctionBody) {
                        /* throw away just added 'function name(...) {'
                         * and restore the original indent
                         */
                        result.setLength(0);
                        indent -= indentGap;
                        newLine = false;
                    }
                }
                if (newLine) {
                    result.append('\n');
                }

                /* add indent if any tokens remain,
                 * less setback if next token is
                 * a label, case or default.
                 */
                if (i + 1 < length) {
                    int less = 0;
                    int nextToken = source.charAt(i + 1);
                    if (nextToken == Token.CASE
                            || nextToken == Token.DEFAULT)
                    {
                        less = indentGap - caseGap;
                    } else if (nextToken == Token.RC) {
                        less = indentGap;
                    }

                    /* elaborate check against label... skip past a
                     * following inlined NAME and look for a COLON.
                     */
                    else if (nextToken == Token.NAME) {
                        int afterName = getSourceStringEnd(source, i + 2);
                        if (source.charAt(afterName) == Token.COLON)
                            less = indentGap;
                    }

                    for (; less < indent; less++)
                        result.append(' ');
                }
                break;
            }
            case Token.DOT:
                result.append('.');
                break;

            case Token.NEW:
                result.append("new ");
                break;

            case Token.DELPROP:
                result.append("delete ");
                break;

            case Token.IF:
                result.append("if ");
                break;

            case Token.ELSE:
                result.append("else ");
                break;

            case Token.FOR:
                result.append("for ");
                break;

            case Token.IN:
                result.append(" in ");
                break;

            case Token.WITH:
                result.append("with ");
                break;

            case Token.WHILE:
                result.append("while ");
                break;

            case Token.DO:
                result.append("do ");
                break;

            case Token.TRY:
                result.append("try ");
                break;

            case Token.CATCH:
                result.append("catch ");
                break;

            case Token.FINALLY:
                result.append("finally ");
                break;

            case Token.THROW:
                result.append("throw ");
                break;

            case Token.SWITCH:
                result.append("switch ");
                break;

            case Token.BREAK:
                result.append("break");
                if (Token.NAME == getNext(source, length, i))
                    result.append(' ');
                break;

            case Token.CONTINUE:
                result.append("continue");
                if (Token.NAME == getNext(source, length, i))
                    result.append(' ');
                break;

            case Token.CASE:
                result.append("case ");
                break;

            case Token.DEFAULT:
                result.append("default");
                break;

            case Token.RETURN:
                result.append("return");
                if (Token.SEMI != getNext(source, length, i))
                    result.append(' ');
                break;

            case Token.VAR:
                result.append("var ");
                break;

            case Token.LET:
                result.append("let ");
                break;

            case Token.SEMI:
                result.append(';');
                if (Token.EOL != getNext(source, length, i)) {
                    // separators in FOR
                    result.append(' ');
                }
                break;

            case Token.ASSIGN:
                result.append(" = ");
                break;

            case Token.ASSIGN_ADD:
                result.append(" += ");
                break;

            case Token.ASSIGN_SUB:
                result.append(" -= ");
                break;

            case Token.ASSIGN_MUL:
                result.append(" *= ");
                break;

            case Token.ASSIGN_DIV:
                result.append(" /= ");
                break;

            case Token.ASSIGN_MOD:
                result.append(" %= ");
                break;

            case Token.ASSIGN_BITOR:
                result.append(" |= ");
                break;

            case Token.ASSIGN_BITXOR:
                result.append(" ^= ");
                break;

            case Token.ASSIGN_BITAND:
                result.append(" &= ");
                break;

            case Token.ASSIGN_LSH:
                result.append(" <<= ");
                break;

            case Token.ASSIGN_RSH:
                result.append(" >>= ");
                break;

            case Token.ASSIGN_URSH:
                result.append(" >>>= ");
                break;

            case Token.HOOK:
                result.append(" ? ");
                break;

            case Token.OBJECTLIT:
//              pun OBJECTLIT to mean colon in objlit property
//              initialization.
//              This needs to be distinct from COLON in the general case
//              to distinguish from the colon in a ternary... which needs
//              different spacing.
                result.append(':');
                break;

            case Token.COLON:
                if (Token.EOL == getNext(source, length, i))
                    // it's the end of a label
                    result.append(':');
                else
                    // it's the middle part of a ternary
                    result.append(" : ");
                break;

            case Token.OR:
                result.append(" || ");
                break;

            case Token.AND:
                result.append(" && ");
                break;

            case Token.BITOR:
                result.append(" | ");
                break;

            case Token.BITXOR:
                result.append(" ^ ");
                break;

            case Token.BITAND:
                result.append(" & ");
                break;

            case Token.SHEQ:
                result.append(" === ");
                break;

            case Token.SHNE:
                result.append(" !== ");
                break;

            case Token.EQ:
                result.append(" == ");
                break;

            case Token.NE:
                result.append(" != ");
                break;

            case Token.LE:
                result.append(" <= ");
                break;

            case Token.LT:
                result.append(" < ");
                break;

            case Token.GE:
                result.append(" >= ");
                break;

            case Token.GT:
                result.append(" > ");
                break;

            case Token.INSTANCEOF:
                result.append(" instanceof ");
                break;

            case Token.LSH:
                result.append(" << ");
                break;

            case Token.RSH:
                result.append(" >> ");
                break;

            case Token.URSH:
                result.append(" >>> ");
                break;

            case Token.TYPEOF:
                result.append("typeof ");
                break;

            case Token.VOID:
                result.append("void ");
                break;

            case Token.CONST:
                result.append("const ");
                break;

            case Token.YIELD:
                result.append("yield ");
                break;

            case Token.NOT:
                result.append('!');
                break;

            case Token.BITNOT:
                result.append('~');
                break;

            case Token.POS:
                result.append('+');
                break;

            case Token.NEG:
                result.append('-');
                break;

            case Token.INC:
                result.append("++");
                break;

            case Token.DEC:
                result.append("--");
                break;

            case Token.ADD:
                result.append(" + ");
                break;

            case Token.SUB:
                result.append(" - ");
                break;

            case Token.MUL:
                result.append(" * ");
                break;

            case Token.DIV:
                result.append(" / ");
                break;

            case Token.MOD:
                result.append(" % ");
                break;

            case Token.COLONCOLON:
                result.append("::");
                break;

            case Token.DOTDOT:
                result.append("..");
                break;

            case Token.DOTQUERY:
                result.append(".(");
                break;

            case Token.XMLATTR:
                result.append('@');
                break;

            default:

            }
            ++i;
        }

        if (!toSource) {
//          add that trailing newline if it's an outermost function.
            if (!justFunctionBody)
                result.append('\n');
        } else {
            if (topFunctionType == FunctionNode.FUNCTION_EXPRESSION) {
                result.append(')');
            }
        }

        return result.toString();
    }

    private static int getNext(String source, int length, int i)
    {
        return (i + 1 < length) ? source.charAt(i + 1) : Token.EOF;
    }

    private static int getSourceStringEnd(String source, int offset)
    {
        return printSourceString(source, offset, false, null);
    }

    private static int printSourceString(String source, int offset,
            boolean asQuotedString,
            StringBuffer sb)
    {
        int length = source.charAt(offset);
        ++offset;
        if ((0x8000 & length) != 0) {
            length = ((0x7FFF & length) << 16) | source.charAt(offset);
            ++offset;
        }
        if (sb != null) {
            String str = source.substring(offset, offset + length);
            if (!asQuotedString) {
                sb.append(str);
            } else {
                sb.append('"');
                sb.append(ScriptRuntime.escapeString(str));
                sb.append('"');
            }
        }
        return offset + length;
    }

    private static int printSourceNumber(String source, int offset,
            StringBuffer sb)
    {
        double number = 0.0;
        char type = source.charAt(offset);
        ++offset;
        if (type == 'S') {
            if (sb != null) {
                int ival = source.charAt(offset);
                number = ival;
            }
            ++offset;
        } else if (type == 'J' || type == 'D') {
            if (sb != null) {
                long lbits;
                lbits = (long)source.charAt(offset) << 48;
                lbits |= (long)source.charAt(offset + 1) << 32;
                lbits |= (long)source.charAt(offset + 2) << 16;
                lbits |= source.charAt(offset + 3);
                if (type == 'J') {
                    number = lbits;
                } else {
                    number = Double.longBitsToDouble(lbits);
                }
            }
            offset += 4;
        } else {
//          Bad source
            throw new RuntimeException();
        }
        if (sb != null) {
            sb.append(ScriptRuntime.numberToString(number, 10));
        }
        return offset;
    }




}
