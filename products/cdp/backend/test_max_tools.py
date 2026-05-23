import pytest

from parameterized import parameterized

from products.cdp.backend.max_tools import CreateHogFunctionFiltersTool, CreateHogTransformationFunctionTool

from ee.hogai.chat_agent.schema_generator.parsers import PydanticOutputParserException


class TestParseOutput:
    @parameterized.expand(
        [
            (
                "slice_syntax",
                "let x := content[1:2000]",
                "The Hog code failed to compile",
            ),
            (
                "double_ampersand",
                "if (a && b) { print(a) }",
                "Unexpected character '&' (U+0026)",
            ),
        ]
    )
    def test_parse_output_includes_specific_parse_error(self, _name, hog_code, expected_fragment):
        tool = CreateHogTransformationFunctionTool.__new__(CreateHogTransformationFunctionTool)
        with pytest.raises(PydanticOutputParserException) as exc_info:
            tool._parse_output(f"<hog_code>{hog_code}</hog_code>")
        assert expected_fragment in str(exc_info.value)

    def test_parse_output_generic_error_for_non_syntax_issues(self):
        # Code that parses but fails at the HyphenatedPropertyDetector stage
        hog_code = "let x := event.some-prop"
        tool = CreateHogTransformationFunctionTool.__new__(CreateHogTransformationFunctionTool)
        with pytest.raises(PydanticOutputParserException) as exc_info:
            tool._parse_output(f"<hog_code>{hog_code}</hog_code>")
        assert "The Hog code failed to compile" in str(exc_info.value)
        # Should NOT contain a specific parse error since it's not a syntax error
        assert "no viable alternative" not in str(exc_info.value)

    def test_parse_output_valid_code(self):
        hog_code = "let x := 1\nreturn event"
        tool = CreateHogTransformationFunctionTool.__new__(CreateHogTransformationFunctionTool)
        result = tool._parse_output(f"<hog_code>{hog_code}</hog_code>")
        assert result.hog_code == hog_code

    def test_filters_parse_output_rejects_ui_metadata_keys(self):
        tool = CreateHogFunctionFiltersTool.__new__(CreateHogFunctionFiltersTool)

        with pytest.raises(PydanticOutputParserException) as exc_info:
            tool._parse_output(
                """
                <filters>
                {
                    "properties": [
                        {
                            "key": "utm_source",
                            "value": "newsletter",
                            "operator": "exact",
                            "type": "event",
                            "label": "Property value"
                        }
                    ]
                }
                </filters>
                """
            )

        assert "Do not write UI metadata" in str(exc_info.value)

    def test_filters_parse_output_accepts_valid_filter_values(self):
        tool = CreateHogFunctionFiltersTool.__new__(CreateHogFunctionFiltersTool)

        result = tool._parse_output(
            """
            <filters>
            {
                "events": [{"id": "$pageview", "name": "$pageview", "type": "events", "order": 0, "properties": []}],
                "properties": [{"key": "utm_source", "value": "newsletter", "operator": "exact", "type": "event"}],
                "filter_test_accounts": false
            }
            </filters>
            """
        )

        assert result.filters["properties"][0]["value"] == "newsletter"
